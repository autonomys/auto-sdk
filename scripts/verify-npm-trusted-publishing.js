#!/usr/bin/env node

/**
 * Preflight for npm trusted publishing (OIDC), run by the release workflow before anything is
 * versioned or pushed. For every package lerna would publish, it performs the same GitHub OIDC to
 * npm token exchange that `lerna publish` performs per package.
 *
 * npm does not validate trusted publisher settings when they are saved, and lerna treats a failed
 * exchange as "no OIDC" rather than an error, so without this check a misconfigured package only
 * fails mid-publish: after the release tag is pushed and the packages before it are already out.
 *
 * It cannot check a trusted publisher's allowed actions: npm issues the same token whether the
 * publisher may `npm publish` or only `npm stage publish`, and enforces that at publish time.
 * lerna publishes directly, so every trusted publisher must allow direct publishing.
 *
 * The exchanged tokens are never read or logged.
 */

const { execFileSync } = require('child_process')

const registry = 'https://registry.npmjs.org'

const fetchGitHubIdToken = async () => {
  const { ACTIONS_ID_TOKEN_REQUEST_URL, ACTIONS_ID_TOKEN_REQUEST_TOKEN } = process.env
  if (!ACTIONS_ID_TOKEN_REQUEST_URL || !ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    throw new Error('GitHub OIDC is unavailable: the job needs `permissions: id-token: write`')
  }
  const url = new URL(ACTIONS_ID_TOKEN_REQUEST_URL)
  url.searchParams.append('audience', `npm:${new URL(registry).hostname}`)
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}` },
  })
  if (!response.ok) {
    throw new Error(`Fetching the GitHub OIDC token failed: HTTP ${response.status}`)
  }
  const { value } = await response.json()
  if (!value) throw new Error('GitHub returned an empty OIDC token')
  return value
}

const exchangeFailure = async (packageName) => {
  const escapedName = packageName.replace('/', '%2f')
  const response = await fetch(`${registry}/-/npm/v1/oidc/token/exchange/package/${escapedName}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await fetchGitHubIdToken()}` },
  })
  if (response.ok) return null
  const { message } = await response.json().catch(() => ({}))
  return `HTTP ${response.status}${message ? ` ${message}` : ''}`
}

const main = async () => {
  const packages = JSON.parse(execFileSync('yarn', ['lerna', 'ls', '--json'], { encoding: 'utf8' }))
  const failed = []
  for (const { name } of packages) {
    const failure = await exchangeFailure(name)
    console.log(failure ? `FAIL ${name}: ${failure}` : `ok   ${name}`)
    if (failure) failed.push(name)
  }

  if (failed.length > 0) {
    // Read the claims npm matches from the token itself: GitHub sets no env var for the job's
    // environment, and omitting it from the npm settings would still pass but drop the binding.
    const idToken = await fetchGitHubIdToken()
    const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString())
    const workflowFile = claims.workflow_ref.split('@')[0].split('/').pop()
    console.log(
      `\nnpm rejected the OIDC token exchange for ${failed.length} of ${packages.length} packages. ` +
        'On npmjs.com, open each package > Settings > Trusted Publisher and add GitHub Actions ' +
        `with repository ${claims.repository}, workflow ${workflowFile}` +
        (claims.environment ? `, environment ${claims.environment}` : '') +
        ', allowing it to publish directly.',
    )
    process.exit(1)
  }
  console.log(`\nnpm trusted publishing is configured for all ${packages.length} packages.`)
}

main().catch((error) => {
  console.log(error.message)
  process.exit(1)
})
