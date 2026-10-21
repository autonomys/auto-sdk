#!/usr/bin/env node

// This program runs in a fresh checkout, WITHOUT installing project dependencies.
// Only regular files below each package's dist/ may cross the build boundary.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const git = (repo, args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' })

const safeRelativePath = (value) => {
  if (
    typeof value !== 'string' ||
    !value ||
    value.includes('\\') ||
    /[\x00-\x1f\x7f:]/.test(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(`Unsafe relative path: ${JSON.stringify(value)}`)
  }
  return value
}

const regularFile = (file, description = file) => {
  const stat = fs.lstatSync(file, { throwIfNoEntry: false })
  if (!stat) throw new Error(`Missing file: ${description}`)
  if (!stat.isFile() || stat.nlink !== 1) {
    throw new Error(`Expected a regular, unlinked file: ${JSON.stringify(file)}`)
  }
  return stat
}

// Validate the WHOLE downloaded tree before copying any of it. Parent directories
// are allowed only when they lead to a declared dist/. Never follow links.
const inspectOutputs = (input, directories) => {
  if (!fs.lstatSync(input).isDirectory()) throw new Error('Output input must be a real directory')
  const roots = directories.map((dir) => `${safeRelativePath(dir)}/dist`)
  const files = []
  const visit = (relative) => {
    safeRelativePath(relative)
    const file = path.join(input, relative)
    const stat = fs.lstatSync(file)
    const inOutput = roots.some((root) => relative.startsWith(`${root}/`))
    const parent = roots.some((root) => root === relative || root.startsWith(`${relative}/`))
    if ((!inOutput && !parent) || (!stat.isDirectory() && !stat.isFile())) {
      throw new Error(`Unexpected build output: ${JSON.stringify(relative)}`)
    }
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(file).sort()) visit(`${relative}/${entry}`)
    } else {
      regularFile(file)
      if (!inOutput) throw new Error(`Expected output directory: ${JSON.stringify(relative)}`)
      files.push(relative)
    }
  }
  for (const entry of fs.readdirSync(input).sort()) visit(entry)
  for (const root of roots) {
    if (!files.some((file) => file.startsWith(`${root}/`))) {
      throw new Error(`Missing or empty build output: ${root}`)
    }
  }
  return files
}

const trackedFiles = (repo) =>
  git(repo, ['ls-files', '--stage', '-z'])
    .split('\0')
    .filter(Boolean)
    .map((entry) => {
      const [metadata, file] = entry.split('\t')
      const [mode, , stage] = metadata.split(' ')
      return { file, mode, stage }
    })

const loadPackages = (repo, directories, tracked) => {
  const { version } = readJson(path.join(repo, 'lerna.json'))
  const manifests = tracked.filter(
    ({ file }) => file.startsWith('packages/') && file.endsWith('/package.json'),
  )
  const expected = new Set(
    directories.map((dir) => `packages/${safeRelativePath(dir)}/package.json`),
  )
  for (const { file } of manifests) {
    if (!readJson(path.join(repo, file)).private && !expected.has(file)) {
      throw new Error(`Public package is missing from package-layout.json: ${file}`)
    }
  }
  const packages = directories.map((directory) => {
    const source = `packages/${directory}`
    if (!manifests.some(({ file }) => file === `${source}/package.json`)) {
      throw new Error(`Package manifest is not tracked: ${source}`)
    }
    const manifest = readJson(path.join(repo, source, 'package.json'))
    if (
      manifest.private ||
      !/^@autonomys\/[a-z0-9][a-z0-9._-]*$/.test(manifest.name) ||
      manifest.version !== version
    ) {
      throw new Error(`Invalid release package identity: ${source}`)
    }
    if (manifest.bundleDependencies || manifest.bundledDependencies) {
      throw new Error(`Bundled dependencies require an explicit assembly policy: ${source}`)
    }
    if (
      manifest.publishConfig !== undefined &&
      JSON.stringify(manifest.publishConfig) !== JSON.stringify({ access: 'public' })
    ) {
      throw new Error(`Only publishConfig.access=public is supported: ${source}`)
    }
    return { directory, source, manifest }
  })
  if (new Set(packages.map(({ manifest }) => manifest.name)).size !== packages.length) {
    throw new Error('Duplicate release package name')
  }
  return packages
}

const copyFile = (from, to, mode = 0o644) => {
  regularFile(from)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL)
  fs.chmodSync(to, mode)
}

// npm receives an empty home/config/cache, no project environment, and only local
// directory specs. In particular it never inherits NODE_OPTIONS or npm_config_*.
const npmEnvironment = (temporary) => ({
  PATH: process.env.PATH,
  HOME: temporary,
  ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
  NPM_CONFIG_USERCONFIG: path.join(temporary, 'npmrc'),
  NPM_CONFIG_GLOBALCONFIG: path.join(temporary, 'global-npmrc'),
  NPM_CONFIG_CACHE: path.join(temporary, 'cache'),
})

const isLicense = (name) => /^licen[cs]e(\.|$)/i.test(name)

const entryPointPath = (target) => {
  const relative = safeRelativePath(target.replace(/^\.\//, ''))
  if (relative.includes('*')) throw new Error(`Wildcard entry point needs a check: ${relative}`)
  return relative
}

const binTargets = (manifest) =>
  (typeof manifest.bin === 'string' ? [manifest.bin] : Object.values(manifest.bin || {})).map(
    entryPointPath,
  )

const entryPoints = (manifest) => {
  const targets = [
    manifest.main,
    manifest.module,
    manifest.types,
    manifest.typings,
    manifest.style,
    ...binTargets(manifest),
  ]
  const walk = (value) => {
    if (typeof value === 'string') targets.push(value)
    else if (value && typeof value === 'object') Object.values(value).forEach(walk)
  }
  walk(manifest.exports)
  return [...new Set(targets.filter(Boolean).map(entryPointPath))]
}

const assemble = ({ repo, input, output, directories }) => {
  repo = fs.realpathSync(repo)
  input = path.resolve(input)
  output = path.resolve(output)
  const tracked = trackedFiles(repo)
  directories ??= readJson(
    path.join(repo, 'scripts/release/package-layout.json'),
  ).packageDirectories
  if (!directories.length || new Set(directories).size !== directories.length) {
    throw new Error('Package layout must contain unique directories')
  }
  const packages = loadPackages(repo, directories, tracked)
  const payloadFiles = inspectOutputs(input, directories)
  // Refuse an existing destination, including a symlink. Never reuse a staging tree.
  fs.mkdirSync(output)
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-sdk-assembly-'))
  const env = npmEnvironment(temporary)
  fs.writeFileSync(env.NPM_CONFIG_USERCONFIG, '')
  fs.writeFileSync(env.NPM_CONFIG_GLOBALCONFIG, '')
  const record = {
    schemaVersion: 1,
    sourceCommit: git(repo, ['rev-parse', 'HEAD']).trim(),
    nodeVersion: process.version,
    npmVersion: execFileSync('npm', ['--version'], {
      cwd: temporary,
      env,
      encoding: 'utf8',
    }).trim(),
    packages: [],
  }
  try {
    for (const { directory, source, manifest } of packages) {
      const stage = path.join(temporary, 'packages', directory)
      fs.mkdirSync(stage, { recursive: true })
      // Preserve tracked package contents and npm's existing files/ignore rules.
      // Build output can never supply or replace any of these source files.
      for (const { file, mode, stage: gitStage } of tracked) {
        if (!file.startsWith(`${source}/`)) continue
        const relative = safeRelativePath(file.slice(source.length + 1))
        if (gitStage !== '0' || !['100644', '100755'].includes(mode)) {
          throw new Error(`Unsupported tracked source entry: ${file}`)
        }
        if (relative === 'dist' || relative.startsWith('dist/')) {
          throw new Error(`Build output must not be tracked in source: ${file}`)
        }
        if (relative === 'package.json' || relative === '.npmrc') continue
        copyFile(
          path.join(repo, file),
          path.join(stage, relative),
          mode === '100755' ? 0o755 : 0o644,
        )
      }
      if (!fs.readdirSync(stage).some(isLicense)) {
        copyFile(path.join(repo, 'LICENSE'), path.join(stage, 'LICENSE'))
      }
      const { publishConfig: _publishConfig, gitHead: _gitHead, ...publishedManifest } = manifest
      publishedManifest.gitHead = record.sourceCommit
      fs.writeFileSync(
        path.join(stage, 'package.json'),
        `${JSON.stringify(publishedManifest, null, 2)}\n`,
      )
      for (const file of payloadFiles.filter((file) => file.startsWith(`${directory}/dist/`))) {
        copyFile(path.join(input, file), path.join(stage, file.slice(directory.length + 1)))
      }
      for (const target of entryPoints(manifest)) {
        regularFile(path.join(stage, target), `${manifest.name}: declared entry point ${target}`)
      }
      const bins = binTargets(manifest)
      for (const bin of bins) fs.chmodSync(path.join(stage, bin), 0o755)
      const [packed] = JSON.parse(
        execFileSync(
          'npm',
          [
            'pack',
            '--ignore-scripts',
            '--workspaces=false',
            '--json',
            '--pack-destination',
            output,
          ],
          { cwd: stage, env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
        ),
      )
      const packedFiles = new Set(packed.files.map(({ path: file }) => file))
      for (const target of entryPoints(manifest)) {
        if (!packedFiles.has(target)) throw new Error(`npm pack omitted entry point: ${target}`)
      }
      for (const bin of bins) {
        const file = packed.files.find((file) => file.path === bin)
        if (!(file.mode & 0o111)) {
          throw new Error(`${manifest.name}: packed bin is not executable: ${bin}`)
        }
      }
      if (![...packedFiles].some(isLicense)) {
        throw new Error(`npm pack omitted the license: ${manifest.name}`)
      }
      for (const file of payloadFiles.filter((file) => file.startsWith(`${directory}/dist/`))) {
        const relative = file.slice(directory.length + 1)
        if (!packedFiles.has(relative))
          throw new Error(`npm pack omitted build output: ${relative}`)
      }
      const bytes = fs.readFileSync(path.join(output, safeRelativePath(packed.filename)))
      record.packages.push({
        name: manifest.name,
        version: manifest.version,
        directory,
        tarball: packed.filename,
        integrity: `sha512-${crypto.createHash('sha512').update(bytes).digest('base64')}`,
        files: packed.files.map((file) => ({
          ...file,
          ...(file.path.startsWith('dist/')
            ? {
                sha256: crypto
                  .createHash('sha256')
                  .update(fs.readFileSync(path.join(stage, file.path)))
                  .digest('hex'),
              }
            : {}),
        })),
      })
    }
    // Written only after every package passed. Failed assembly is never a candidate.
    fs.writeFileSync(path.join(output, 'manifest.json'), `${JSON.stringify(record, null, 2)}\n`)
    return record
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}

if (require.main === module) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output || process.argv.length !== 4) {
    console.error(
      'Usage: node scripts/release/assemble.js <downloaded-outputs> <new-output-directory>',
    )
    process.exitCode = 1
  } else {
    const record = assemble({ repo: path.resolve(__dirname, '../..'), input, output })
    console.log(`Assembled ${record.packages.length} packages from ${record.sourceCommit}`)
  }
}

module.exports = { assemble, binTargets, entryPoints, inspectOutputs, safeRelativePath }
