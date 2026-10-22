#!/usr/bin/env node

// Dependency-free control plane. Never install or execute package code in the
// jobs that use this file with repository write permission.
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync, spawnSync } = require('node:child_process')
const { releaseVersion, newerThan: isNewer } = require('./publish')

const REPOSITORY = 'autonomys/auto-sdk'
const ASSEMBLY_JOB = 'Assemble release packages'
const PUBLISH_JOB = 'Publish verified packages'
const git = (repo, args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()
const versionInfo = (version) => ({ version, ...releaseVersion(version) })
const currentVersion = (repo) => JSON.parse(fs.readFileSync(path.join(repo, 'lerna.json'))).version
const nextVersion = (version, type) => {
  const { parts, beta } = versionInfo(version)
  let [major, minor, patch] = parts
  let nextBeta
  switch (type) {
    case 'major':
      if (minor !== 0n || patch !== 0n || beta === undefined) major++
      minor = patch = 0n
      break
    case 'minor':
      if (patch !== 0n || beta === undefined) minor++
      patch = 0n
      break
    case 'patch':
      if (beta === undefined) patch++
      break
    case 'premajor':
      major++
      minor = patch = 0n
      nextBeta = 0n
      break
    case 'preminor':
      minor++
      patch = 0n
      nextBeta = 0n
      break
    case 'prepatch':
      patch++
      nextBeta = 0n
      break
    case 'prerelease':
      if (beta === undefined) {
        patch++
        nextBeta = 0n
      } else nextBeta = BigInt(beta) + 1n
      break
    default:
      throw new Error(`Unsupported release type: ${type}`)
  }
  return `${major}.${minor}.${patch}${nextBeta === undefined ? '' : `-beta.${nextBeta}`}`
}

const githubApi =
  (token, fetch = globalThis.fetch) =>
  async (route, options = {}) => {
    if (!token) throw new Error('Missing GitHub API token')
    const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/${route}`, {
      method: options.method || 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    })
    if (response.status === 404 && options.optional && !options.method) return undefined
    if (!response.ok)
      throw Object.assign(new Error(`GitHub ${route}: HTTP ${response.status}`), {
        status: response.status,
      })
    return response.json()
  }

const context = (repo, env) => {
  if (
    env.GITHUB_REPOSITORY !== REPOSITORY ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    env.GITHUB_SERVER_URL !== 'https://github.com' ||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '') ||
    git(repo, ['rev-parse', 'HEAD']) !== env.GITHUB_SHA
  )
    throw new Error('Release control requires the original main commit in autonomys/auto-sdk')
}
const tagCommit = (repo, version) => {
  versionInfo(version)
  const ref = `refs/tags/v${version}`
  const result = spawnSync('git', ['show-ref', '--verify', '--quiet', ref], { cwd: repo })
  if (result.error) throw result.error
  if (result.status === 1) return undefined
  if (result.status !== 0) throw new Error(`Cannot inspect ${ref}`)
  return git(repo, ['rev-parse', `${ref}^{commit}`])
}
const requireCompletedRelease = async (repo, version, api) => {
  if (!tagCommit(repo, version))
    throw new Error(
      `v${version} has no tag; finish its original Release run before preparing or publishing another version`,
    )
  const release = await api(`releases/tags/v${version}`, { optional: true })
  if (!release || release.draft || release.tag_name !== `v${version}`)
    throw new Error(
      `v${version} has no completed GitHub release; finish its original Release run first`,
    )
}
const checkExistingRelease = (existing, version, tag) => {
  if (
    existing &&
    (existing.draft ||
      existing.tag_name !== `v${version}` ||
      existing.prerelease !== (tag === 'beta'))
  )
    throw new Error(`v${version} has a conflicting GitHub release; resolve it before retrying`)
}

const planRelease = async ({ repo, env, api }) => {
  context(repo, env)
  const { version, tag } = versionInfo(currentVersion(repo))
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch') return { version, tag, release: false }
  if (
    env.GITHUB_EVENT_NAME !== 'push' ||
    !/^[a-f0-9]{40}$/.test(env.BEFORE || '') ||
    /^0+$/.test(env.BEFORE)
  )
    throw new Error('Release planning requires a main push with its original before SHA')
  const previous = JSON.parse(git(repo, ['show', `${env.BEFORE}:lerna.json`])).version
  if (version === previous) return { version, tag, release: false }
  if (!isNewer(version, previous))
    throw new Error(`Release version must increase: ${previous} -> ${version}`)
  await requireCompletedRelease(repo, previous, api)
  const tagged = tagCommit(repo, version)
  if (tagged && tagged !== env.GITHUB_SHA)
    throw new Error(`v${version} already tags a different commit`)
  // Check deterministic finalization preconditions before any packages reach npm.
  releaseNotes(repo, version)
  checkExistingRelease(await api(`releases/tags/v${version}`, { optional: true }), version, tag)
  // An existing tag at this commit is allowed: finalization may have failed
  // after creating it. Only this original version-changing push can continue.
  return { version, tag, release: true }
}

const guardAssembly = async ({ env, api }) => {
  if (
    !/^[1-9]\d*$/.test(env.GITHUB_RUN_ID || '') ||
    !/^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT || '')
  )
    throw new Error('Missing original workflow run identity')
  const attempt = Number(env.GITHUB_RUN_ATTEMPT)
  if (attempt === 1) return
  let seen = 0
  for (let page = 1; ; page++) {
    const result = await api(
      `actions/runs/${env.GITHUB_RUN_ID}/jobs?filter=all&per_page=100&page=${page}`,
    )
    if (
      !Array.isArray(result.jobs) ||
      !Number.isInteger(result.total_count) ||
      result.total_count < 1 ||
      !result.jobs.length
    )
      throw new Error('Cannot verify earlier release attempts; refusing to rebuild')
    for (const job of result.jobs) {
      if (!Number.isInteger(job.run_attempt) || job.run_attempt < 1)
        throw new Error('Invalid prior job identity')
      if (job.run_attempt >= attempt) continue
      if (
        (job.name === ASSEMBLY_JOB && job.conclusion === 'success') ||
        (job.name === PUBLISH_JOB && job.status !== 'queued' && job.conclusion !== 'skipped')
      )
        throw new Error(
          'Original release artifacts are sealed. Re-run only failed verification, publishing, or finalization jobs; never rebuild or reassemble this release',
        )
    }
    seen += result.jobs.length
    if (seen >= result.total_count) return
  }
}

const releaseNotes = (repo, version) => {
  const text = fs.readFileSync(path.join(repo, 'CHANGELOG.md'), 'utf8')
  const sections = text.split(/(?=^## \[)/m)
  const matches = sections.filter((section) => section.startsWith(`## [${version}]`))
  if (matches.length !== 1) throw new Error(`Expected one CHANGELOG.md section for ${version}`)
  return matches[0].trim()
}

const finalizeRelease = async ({ repo, env, api }) => {
  context(repo, env)
  const { version, tag } = versionInfo(currentVersion(repo))
  if (
    env.GITHUB_EVENT_NAME !== 'push' ||
    env.SOURCE_COMMIT !== env.GITHUB_SHA ||
    !/^[a-f0-9]{64}$/.test(env.MANIFEST_SHA256 || '') ||
    !/^[1-9]\d*$/.test(env.ARTIFACT_ID || '') ||
    !/^[1-9]\d*$/.test(env.GITHUB_RUN_ID || '')
  )
    throw new Error('Missing trusted publication identity')
  const name = `v${version}`
  const notes = releaseNotes(repo, version)
  const checkTag = async (ref) => {
    let object = ref.object
    for (let depth = 0; object?.type === 'tag' && depth < 5; depth++)
      object = (await api(`git/tags/${object.sha}`)).object
    if (object?.type !== 'commit' || object.sha !== env.SOURCE_COMMIT)
      throw new Error(`${name} already tags a different commit; refusing to replace it`)
  }
  let ref = await api(`git/ref/tags/${name}`, { optional: true })
  if (!ref) {
    try {
      ref = await api('git/refs', {
        method: 'POST',
        body: { ref: `refs/tags/${name}`, sha: env.SOURCE_COMMIT },
      })
    } catch (error) {
      if (error.status !== 422) throw error
      ref = await api(`git/ref/tags/${name}`)
    }
  }
  await checkTag(ref)
  const existing = await api(`releases/tags/${name}`, { optional: true })
  const prerelease = tag === 'beta'
  checkExistingRelease(existing, version, tag)
  if (existing) {
    return existing.html_url
  }
  const receipt = `\n\nSource: \`${env.SOURCE_COMMIT}\`\n\nAssembly manifest SHA-256: \`${env.MANIFEST_SHA256}\`\n\n[Original release artifacts](https://github.com/${REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}/artifacts/${env.ARTIFACT_ID})`
  const release = await api('releases', {
    method: 'POST',
    body: {
      tag_name: name,
      target_commitish: env.SOURCE_COMMIT,
      name,
      body: notes + receipt,
      draft: false,
      prerelease,
      make_latest: prerelease ? 'false' : 'true',
    },
  })
  return release.html_url
}

if (require.main === module) {
  const repo = path.resolve(__dirname, '../..')
  const env = process.env
  const api = githubApi(env.GITHUB_TOKEN)
  const main = async () => {
    switch (process.argv[2]) {
      case 'next-version':
        console.log(nextVersion(currentVersion(repo), env.RELEASE_TYPE))
        break
      case 'plan': {
        const result = await planRelease({ repo, env, api })
        fs.appendFileSync(
          env.GITHUB_OUTPUT,
          Object.entries(result)
            .map(([key, value]) => `${key}=${value}\n`)
            .join(''),
        )
        console.log(JSON.stringify(result))
        break
      }
      case 'guard-assembly':
        await guardAssembly({ env, api })
        break
      case 'prepare':
        context(repo, env)
        if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch')
          throw new Error('Prepare release requires manual dispatch on main')
        await requireCompletedRelease(repo, currentVersion(repo), api)
        break
      case 'finalize':
        console.log(await finalizeRelease({ repo, env, api }))
        break
      default:
        throw new Error('Expected plan, guard-assembly, prepare, or finalize')
    }
  }
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = {
  ASSEMBLY_JOB,
  PUBLISH_JOB,
  githubApi,
  versionInfo,
  isNewer,
  nextVersion,
  context,
  planRelease,
  guardAssembly,
  releaseNotes,
  finalizeRelease,
}
