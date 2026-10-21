const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { test } = require('node:test')
const { assemble, inspectOutputs, safeRelativePath } = require('./assemble')
const { verifyInstalledPackage } = require('./verify-installation')

const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value))
}

const fixture = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-sdk-assembly-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const repo = path.join(root, 'source')
  const input = path.join(root, 'input')
  const output = path.join(root, 'packed')
  const marker = path.join(root, 'lifecycle-ran')
  const directories = ['base', 'utility/app']
  fs.mkdirSync(repo)
  write(path.join(repo, 'lerna.json'), { version: '1.2.3' })
  write(path.join(repo, 'LICENSE'), 'MIT fixture license\n')
  for (const directory of directories) {
    const name = directory.split('/').pop()
    write(path.join(repo, 'packages', directory, 'package.json'), {
      name: `@autonomys/${name}`,
      version: '1.2.3',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      style: 'dist/styles.css',
      ...(name === 'app'
        ? { bin: { 'fixture-app': 'dist/cli.js' }, dependencies: { '@autonomys/base': '1.2.3' } }
        : { files: ['dist', 'README.md'] }),
      publishConfig: { access: 'public' },
      scripts: Object.fromEntries(
        ['prepare', 'prepack', 'postpack', 'prepublishOnly', 'install'].map((event) => [
          event,
          `node -e ${JSON.stringify(`require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`)}`,
        ]),
      ),
    })
    write(path.join(repo, 'packages', directory, 'README.md'), `# ${name}\n`)
    write(path.join(repo, 'packages', directory, '.npmrc'), 'registry=https://invalid.example\n')
    write(path.join(repo, 'packages', directory, 'src/index.ts'), 'export const source = true\n')
    write(
      path.join(input, directory, 'dist/index.js'),
      `module.exports = ${JSON.stringify(name)}\n`,
    )
    write(path.join(input, directory, 'dist/index.d.ts'), 'export declare const value: string\n')
    write(path.join(input, directory, 'dist/styles.css'), ':root { color: red; }\n')
    // Nested manifests are payload data, not publishing policy.
    write(path.join(input, directory, 'dist/nested/package.json'), {
      name: '@attacker/ignored',
      publishConfig: { registry: 'https://invalid.example' },
    })
    if (name === 'app') {
      write(
        path.join(input, directory, 'dist/cli.js'),
        '#!/usr/bin/env node\nconsole.log("fixture")\n',
      )
    }
  }
  // This disposable repository exists only to model a fresh, tracked checkout.
  const git = (args) =>
    execFileSync('git', args, {
      cwd: repo,
      stdio: 'pipe',
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.invalid',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.invalid',
      },
    })
  git(['init', '--quiet'])
  git(['add', '.'])
  git(['commit', '--quiet', '--no-gpg-sign', '-m', 'fixture'])
  return { root, repo, input, output, marker, directories, git }
}

test('assembled packages install offline, preserve payloads, and never run lifecycle scripts', (t) => {
  const f = fixture(t)
  const record = assemble(f)
  assert.equal(record.packages.length, 2)
  assert.equal(record.sourceCommit, f.git(['rev-parse', 'HEAD']).toString().trim())
  const consumer = path.join(f.root, 'consumer')
  write(path.join(consumer, 'package.json'), { private: true })
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      '--cache',
      path.join(f.root, 'npm-cache'),
      '--registry=https://invalid.example',
      ...record.packages.map((pkg) => path.join(f.output, pkg.tarball)),
    ],
    { cwd: consumer, stdio: 'pipe' },
  )
  for (const pkg of record.packages) {
    const installed = path.join(consumer, 'node_modules', pkg.name)
    verifyInstalledPackage(installed, pkg, record.sourceCommit)
    const manifest = JSON.parse(fs.readFileSync(path.join(installed, 'package.json')))
    assert.equal(manifest.name, pkg.name)
    assert.equal(manifest.publishConfig, undefined)
    assert.equal(manifest.gitHead, record.sourceCommit)
    assert.equal(fs.existsSync(path.join(installed, '.npmrc')), false)
    assert.equal(fs.readFileSync(path.join(installed, 'LICENSE'), 'utf8'), 'MIT fixture license\n')
    assert.equal(
      fs.readFileSync(path.join(installed, 'dist/styles.css'), 'utf8'),
      ':root { color: red; }\n',
    )
    assert.equal(
      fs.readFileSync(path.join(installed, 'dist/index.js'), 'utf8'),
      fs.readFileSync(path.join(f.input, pkg.directory, 'dist/index.js'), 'utf8'),
    )
    assert.ok(pkg.integrity.startsWith('sha512-'))
    assert.equal(require(installed), pkg.name.split('/').pop())
  }
  const app = record.packages.find((pkg) => pkg.name === '@autonomys/app')
  assert.equal(app.files.find((file) => file.path === 'dist/cli.js').mode & 0o777, 0o755)
  assert.equal(fs.existsSync(f.marker), false)
  // Existing npm "files" behavior is retained, including packages without it.
  assert.equal(fs.existsSync(path.join(consumer, 'node_modules/@autonomys/base/src')), false)
  assert.equal(fs.existsSync(path.join(consumer, 'node_modules/@autonomys/app/src/index.ts')), true)
})

for (const entry of [
  'base/package.json',
  'base/.npmrc',
  'base/scripts/publish.js',
  'manifest.json',
  '.npmrc',
  'unknown/dist/index.js',
  'base/escape',
  'base/dist/..\\escape',
  'base/dist/a\n::warning::injection',
]) {
  test(`rejects unexpected artifact entry ${JSON.stringify(entry)}`, (t) => {
    const f = fixture(t)
    write(path.join(f.input, entry), '{}')
    assert.throws(() => assemble(f), /Unexpected build output|Unsafe relative path/)
    assert.equal(fs.existsSync(f.output), false)
  })
}

for (const kind of ['file', 'directory', 'root', 'hardlink', 'fifo']) {
  test(`rejects ${kind} links/special files before assembly`, (t) => {
    const f = fixture(t)
    const target = path.join(f.input, 'base/dist/injected')
    if (kind === 'file') fs.symlinkSync(path.join(f.repo, 'LICENSE'), target)
    if (kind === 'directory') fs.symlinkSync(f.repo, target)
    if (kind === 'root') {
      fs.renameSync(f.input, `${f.input}-real`)
      fs.symlinkSync(`${f.input}-real`, f.input)
    }
    if (kind === 'hardlink') fs.linkSync(path.join(f.repo, 'LICENSE'), target)
    if (kind === 'fifo') execFileSync('mkfifo', [target])
    assert.throws(() => assemble(f), /Unexpected build output|regular|real directory/)
    assert.equal(fs.existsSync(f.output), false)
  })
}

test('rejects missing and empty package output directories', (t) => {
  const f = fixture(t)
  fs.rmSync(path.join(f.input, 'base/dist'), { recursive: true })
  assert.throws(() => inspectOutputs(f.input, f.directories), /Missing or empty/)
  fs.mkdirSync(path.join(f.input, 'base/dist'))
  assert.throws(() => inspectOutputs(f.input, f.directories), /Missing or empty/)
})

test('does not reuse an output directory or follow an output symlink', (t) => {
  const f = fixture(t)
  fs.symlinkSync(f.repo, f.output)
  assert.throws(() => assemble(f), /EEXIST/)
  assert.equal(fs.existsSync(path.join(f.repo, 'manifest.json')), false)
})

test('rejects untracked public packages in the release layout and omitted tracked packages', (t) => {
  const f = fixture(t)
  assert.throws(() => assemble({ ...f, directories: ['base'] }), /missing from package-layout/)
  assert.throws(
    () => assemble({ ...f, directories: [...f.directories, 'extra'] }),
    /manifest is not tracked/,
  )
})

test('does not accept build-controlled npm policy even when source permits public access', (t) => {
  const f = fixture(t)
  write(path.join(f.input, 'base/package.json'), {
    name: '@autonomys/base',
    version: '1.2.3',
    publishConfig: { proxy: 'http://attacker.invalid' },
  })
  assert.throws(() => assemble(f), /Unexpected build output/)
})

test('fails when npm would omit an entry point or compiled asset', (t) => {
  const f = fixture(t)
  const file = path.join(f.repo, 'packages/base/package.json')
  const manifest = JSON.parse(fs.readFileSync(file))
  manifest.files = ['README.md']
  write(file, manifest)
  assert.throws(() => assemble(f), /npm pack omitted/)
  assert.equal(fs.existsSync(path.join(f.output, 'manifest.json')), false)
})

for (const entry of ['index.d.ts', 'styles.css']) {
  test(`fails with package context when declared entry point ${entry} is not built`, (t) => {
    const f = fixture(t)
    fs.rmSync(path.join(f.input, 'base/dist', entry))
    assert.throws(() => assemble(f), {
      message: `Missing file: @autonomys/base: declared entry point dist/${entry}`,
    })
    assert.equal(fs.existsSync(path.join(f.output, 'manifest.json')), false)
  })
}

test('rejects a packed CLI without executable permissions if staging chmod regresses', (t) => {
  const f = fixture(t)
  const chmod = fs.chmodSync
  t.mock.method(fs, 'chmodSync', (file, mode) => {
    if (file.endsWith('/dist/cli.js') && mode === 0o755) return
    return chmod(file, mode)
  })
  assert.throws(() => assemble(f), /@autonomys\/app: packed bin is not executable: dist\/cli.js/)
  assert.equal(fs.existsSync(path.join(f.output, 'manifest.json')), false)
})

test('installation verification checks packed bin permissions even when the installed bin is executable', (t) => {
  const f = fixture(t)
  const installed = path.join(f.root, 'installed')
  const pkg = {
    name: '@autonomys/app',
    version: '1.2.3',
    files: [{ path: 'dist/cli.js', mode: 0o644 }],
  }
  write(path.join(installed, 'package.json'), {
    name: pkg.name,
    version: pkg.version,
    gitHead: 'source',
    bin: './dist/cli.js',
  })
  write(path.join(installed, 'dist/cli.js'), '#!/usr/bin/env node\n')
  fs.chmodSync(path.join(installed, 'dist/cli.js'), 0o755)
  assert.throws(
    () => verifyInstalledPackage(installed, pkg, 'source'),
    /@autonomys\/app: packed bin is not executable: dist\/cli.js/,
  )
})

for (const field of ['main', 'style', 'bin', 'recorded file']) {
  test(`installation verification names the package and missing ${field}`, (t) => {
    const f = fixture(t)
    const installed = path.join(f.root, 'installed')
    const pkg = { name: '@autonomys/app', version: '1.2.3', files: [] }
    const manifest = { name: pkg.name, version: pkg.version, gitHead: 'source' }
    if (field === 'recorded file') pkg.files.push({ path: 'dist/missing' })
    else manifest[field] = 'dist/missing'
    write(path.join(installed, 'package.json'), manifest)
    assert.throws(
      () => verifyInstalledPackage(installed, pkg, 'source'),
      /@autonomys\/app: missing dist\/missing/,
    )
  })
}

test('assembly supports a string bin target with a leading ./', (t) => {
  const f = fixture(t)
  const file = path.join(f.repo, 'packages/utility/app/package.json')
  const manifest = JSON.parse(fs.readFileSync(file))
  manifest.bin = './dist/cli.js'
  write(file, manifest)
  const record = assemble(f)
  const app = record.packages.find((pkg) => pkg.name === '@autonomys/app')
  assert.equal(app.files.find((file) => file.path === 'dist/cli.js').mode & 0o777, 0o755)
})

test('rejects source publish settings outside the public-access policy', (t) => {
  const f = fixture(t)
  const file = path.join(f.repo, 'packages/base/package.json')
  const manifest = JSON.parse(fs.readFileSync(file))
  manifest.publishConfig.proxy = 'http://invalid.example'
  write(file, manifest)
  assert.throws(() => assemble(f), /Only publishConfig.access/)
})

test('relative path validation rejects traversal, absolute paths, and control characters', () => {
  for (const value of [
    '../x',
    'base/dist/../escape',
    '/tmp/x',
    'a//b',
    './a',
    'C:/x',
    'a\\b',
    'a\0b',
  ]) {
    assert.throws(() => safeRelativePath(value), /Unsafe relative path/)
  }
})
