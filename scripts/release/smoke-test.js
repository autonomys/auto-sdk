#!/usr/bin/env node

// Runs ONLY in an unprivileged job. Installation and runtime checks must never
// share a runner with publication, even though installation scripts are disabled.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const { execFileSync } = require('node:child_process')
const { entryPoints, safeRelativePath } = require('./assemble')

const [argument] = process.argv.slice(2)
if (!argument || process.argv.length !== 3) {
  throw new Error('Usage: node scripts/release/smoke-test.js <assembled-packages>')
}
const artifacts = path.resolve(argument)
const record = JSON.parse(fs.readFileSync(path.join(artifacts, 'manifest.json')))
assert.equal(record.schemaVersion, 1)
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-sdk-consumer-'))
try {
  const tarballs = record.packages.map((pkg) => {
    const tarball = path.join(artifacts, safeRelativePath(pkg.tarball))
    const integrity = `sha512-${crypto.createHash('sha512').update(fs.readFileSync(tarball)).digest('base64')}`
    assert.equal(integrity, pkg.integrity, `Tarball integrity mismatch: ${pkg.name}`)
    return tarball
  })
  fs.writeFileSync(path.join(temporary, 'package.json'), '{"private":true}\n')
  // Yarn already permits the repo's conflicting React peer ranges. Keep this
  // packaging check independent of those existing conflicts; it is not a peer-
  // compatibility test. All SDK packages are installed from the local tarballs.
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--legacy-peer-deps',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      '--registry=https://registry.npmjs.org',
      '--cache',
      path.join(temporary, 'cache'),
      ...tarballs,
    ],
    { cwd: temporary, stdio: 'inherit' },
  )
  const requireFromConsumer = createRequire(path.join(temporary, 'package.json'))
  for (const pkg of record.packages) {
    assert.match(pkg.name, /^@autonomys\/[a-z0-9][a-z0-9._-]*$/)
    const installed = path.join(temporary, 'node_modules', pkg.name)
    const manifest = JSON.parse(fs.readFileSync(path.join(installed, 'package.json')))
    assert.equal(manifest.name, pkg.name)
    assert.equal(manifest.version, pkg.version)
    assert.equal(manifest.gitHead, record.sourceCommit)
    assert.equal(manifest.publishConfig, undefined)
    assert.equal(fs.existsSync(path.join(installed, '.npmrc')), false)
    for (const entry of entryPoints(manifest)) {
      assert.ok(fs.statSync(path.join(installed, entry)).isFile(), `${pkg.name}: missing ${entry}`)
    }
    for (const file of pkg.files) {
      const installedFile = path.join(installed, safeRelativePath(file.path))
      assert.ok(fs.statSync(installedFile).isFile(), `${pkg.name}: missing ${file.path}`)
      if (file.sha256) {
        const digest = crypto
          .createHash('sha256')
          .update(fs.readFileSync(installedFile))
          .digest('hex')
        assert.equal(digest, file.sha256, `${pkg.name}: changed ${file.path}`)
      }
    }
    const bins =
      typeof manifest.bin === 'string' ? [manifest.bin] : Object.values(manifest.bin || {})
    for (const bin of bins) {
      assert.ok(
        fs.statSync(path.join(installed, bin)).mode & 0o111,
        `${pkg.name}: non-executable bin`,
      )
    }
    // Resolution does not execute browser bundles or start CLI servers.
    if (manifest.main || manifest.exports) requireFromConsumer.resolve(pkg.name)
    console.log(`Verified installed contents: ${pkg.name}@${pkg.version}`)
  }
  // Exercise a real installed SDK API, resolving exclusively from the consumer.
  execFileSync(
    process.execPath,
    [
      '-e',
      `const assert = require('node:assert/strict');
       const { asyncIterableToBuffer, bufferToAsyncIterable } = require('@autonomys/asynchronous');
       asyncIterableToBuffer(bufferToAsyncIterable(Buffer.from('release smoke test')))
         .then(result => assert.equal(result.toString(), 'release smoke test'))
         .catch(error => { console.error(error); process.exitCode = 1; });`,
    ],
    { cwd: temporary, stdio: 'inherit' },
  )
  console.log(`Installation smoke checks passed for all ${record.packages.length} packages.`)
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
