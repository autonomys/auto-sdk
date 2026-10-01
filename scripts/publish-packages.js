#!/usr/bin/env node

/**
 * Publishes the tarballs listed in a manifest.json from pack-packages.js, in its dependency order,
 * using npm trusted publishing. Versions already on npm are skipped, so re-running after a partial
 * failure publishes only what is missing. With DRY_RUN=true it lists what it would publish.
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const registry = 'https://registry.npmjs.org'
const manifestPath = path.resolve(process.argv[2])
const dryRun = process.env.DRY_RUN === 'true'

const isPublished = async ({ name, version }) => {
  const response = await fetch(`${registry}/${name.replace('/', '%2f')}/${version}`)
  if (response.status === 404) return false
  if (!response.ok) {
    throw new Error(`Checking ${name}@${version} on npm failed: HTTP ${response.status}`)
  }
  return true
}

const main = async () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  for (const pkg of manifest) {
    const spec = `${pkg.name}@${pkg.version}`
    if (await isPublished(pkg)) {
      console.log(`skip ${spec}: already on npm`)
      continue
    }
    if (dryRun) {
      console.log(`would publish ${spec}`)
      continue
    }
    console.log(`publishing ${spec}`)
    const tarball = path.join(path.dirname(manifestPath), pkg.tarball)
    execFileSync('npm', ['publish', tarball, '--provenance', '--ignore-scripts'], {
      stdio: 'inherit',
    })
  }
}

main().catch((error) => {
  console.log(error.message)
  process.exit(1)
})
