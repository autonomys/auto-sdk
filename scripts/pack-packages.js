#!/usr/bin/env node

/**
 * Packs every public package into the given directory and writes a manifest.json there listing
 * them in dependency order. The release workflow's publish job publishes from this directory
 * alone, so it never installs dependencies or runs package scripts.
 *
 * The tarballs match what `lerna publish` produced:
 * - `--workspaces=false` packs each package on its own. Inside a workspace, npm pack also applies
 *   the root .gitignore, which ignores dist/ and drops the build output of packages that have no
 *   `files` field.
 * - Packages without a LICENSE get the root one for the duration of the pack, as lerna did.
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const outDir = path.resolve(process.argv[2])
const rootLicense = path.join(__dirname, '..', 'LICENSE')
fs.mkdirSync(outDir, { recursive: true })

const packages = JSON.parse(
  execFileSync('yarn', ['lerna', 'ls', '--toposort', '--json'], { encoding: 'utf8' }),
)

const pack = ({ name, version, location }) => {
  const hasLicense = fs.readdirSync(location).some((file) => /^licen[cs]e(\.|$)/i.test(file))
  const copiedLicense = path.join(location, 'LICENSE')
  if (!hasLicense) fs.copyFileSync(rootLicense, copiedLicense)
  try {
    execFileSync('npm', ['pack', '--workspaces=false', '--pack-destination', outDir], {
      cwd: location,
      stdio: 'inherit',
    })
  } finally {
    if (!hasLicense) fs.rmSync(copiedLicense)
  }

  const tarball = `${name.replace('@', '').replace('/', '-')}-${version}.tgz`
  if (!fs.existsSync(path.join(outDir, tarball))) {
    throw new Error(`npm pack did not produce ${tarball} for ${name}`)
  }
  return { name, version, tarball }
}

const manifest = packages.map(pack)
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`\nPacked ${manifest.length} packages into ${outDir}`)
