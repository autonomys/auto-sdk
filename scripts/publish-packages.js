#!/usr/bin/env node

/**
 * Publishes the tarballs listed in a manifest.json from pack-packages.js, in its dependency order,
 * using npm trusted publishing. Versions already on npm are skipped, so re-running after a partial
 * failure publishes only what is missing. With DRY_RUN=true it lists what it would publish.
 *
 * The tarballs come from a job that runs third-party code, so before publishing anything their
 * package.json is checked against this checkout: every public package exactly once, at the version
 * in lerna.json. npm applies a tarball's publishConfig as npm config, including registry and proxy
 * settings, before it exchanges the GitHub OIDC token for an npm token, so a tampered publishConfig
 * could send that token elsewhere. Only `access: "public"` is allowed.
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const registry = 'https://registry.npmjs.org'
const repoRoot = path.join(__dirname, '..')
const manifestPath = path.resolve(process.argv[2])
const dryRun = process.env.DRY_RUN === 'true'

const findPackageJsonFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : findPackageJsonFiles(entryPath)
    }
    return entry.name === 'package.json' ? [entryPath] : []
  })

const publicPackageNames = () =>
  findPackageJsonFiles(path.join(repoRoot, 'packages'))
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
    .filter((pkg) => !pkg.private)
    .map((pkg) => pkg.name)

const readTarballPackageJson = (tarball) =>
  JSON.parse(execFileSync('tar', ['-xzOf', tarball, 'package/package.json'], { encoding: 'utf8' }))

const loadCheckedPackages = (manifest) => {
  const { version } = JSON.parse(fs.readFileSync(path.join(repoRoot, 'lerna.json'), 'utf8'))
  const expected = new Set(publicPackageNames())
  const problems = []
  const seen = new Set()

  const packages = manifest.map(({ tarball: file }) => {
    const tarball = path.join(path.dirname(manifestPath), file)
    const { name, version: tarballVersion, publishConfig } = readTarballPackageJson(tarball)
    if (!expected.has(name)) problems.push(`${file}: ${name} is not a public package in this repo`)
    if (seen.has(name)) problems.push(`${file}: ${name} appears more than once`)
    seen.add(name)
    if (tarballVersion !== version) {
      problems.push(`${file}: version ${tarballVersion} does not match lerna.json's ${version}`)
    }
    const { access, ...otherSettings } = publishConfig ?? {}
    const otherKeys = Object.keys(otherSettings)
    if (otherKeys.length > 0) {
      problems.push(`${file}: publishConfig may only set access, not ${otherKeys.join(', ')}`)
    }
    if (access !== undefined && access !== 'public') {
      problems.push(`${file}: publishConfig.access must be "public", not ${JSON.stringify(access)}`)
    }
    return { name, version: tarballVersion, tarball }
  })

  for (const name of expected) {
    if (!seen.has(name)) problems.push(`${name} has no tarball in ${manifestPath}`)
  }
  if (problems.length > 0) {
    throw new Error(`Refusing to publish:\n${problems.map((problem) => `- ${problem}`).join('\n')}`)
  }
  return packages
}

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
  for (const pkg of loadCheckedPackages(manifest)) {
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
    execFileSync(
      'npm',
      ['publish', pkg.tarball, `--registry=${registry}/`, '--provenance', '--ignore-scripts'],
      { stdio: 'inherit' },
    )
  }
}

main().catch((error) => {
  console.log(error.message)
  process.exit(1)
})
