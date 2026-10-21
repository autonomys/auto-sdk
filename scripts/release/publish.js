#!/usr/bin/env node

// Run only in a fresh publisher job: no dependency install, build, or package execution.
// The expected commit and manifest digest MUST come from the trusted assembly job,
// independently of the downloaded artifact. A digest supplied by the artifact is not trust.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync, spawnSync } = require('node:child_process')
const { parseArgs } = require('node:util')
const { setTimeout: sleep } = require('node:timers/promises')

const REGISTRY = 'https://registry.npmjs.org/'
const hash = (bytes, algorithm, encoding) =>
  crypto.createHash(algorithm).update(bytes).digest(encoding)
const integrity = (bytes) => `sha512-${hash(bytes, 'sha512', 'base64')}`
const readFile = (file) => {
  const stat = fs.lstatSync(file)
  if (!stat.isFile() || stat.nlink !== 1) throw new Error(`Not a regular, unlinked file: ${file}`)
  return fs.readFileSync(file)
}
const git = (repo, args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()

// Use the runner's tar implementation, not a custom archive parser. Nothing is
// extracted to disk or executed, and tar receives no credentials or TAR_OPTIONS.
const verifyPackagedManifest = (file, source) => {
  const tar = (args) => {
    // node-tar can read past a zero block. Inspect those entries too, and never
    // accept a partial or ambiguous read just because system tar exits zero.
    const result = spawnSync('tar', ['--ignore-zeros', '--file', file, ...args], {
      env: { PATH: process.env.PATH, LC_ALL: 'C' },
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.error) throw result.error
    if (result.status !== 0 || result.stderr)
      throw new Error(`tar inspection failed (${result.signal || result.status}): ${result.stderr}`)
    return result.stdout
  }
  try {
    const entries = tar(['--list', '--gzip']).replace(/\n$/, '').split('\n')
    // npm strips the first path component. Require the assembler's canonical
    // package/ paths so aliases or duplicate manifests cannot disagree with npm.
    const paths = entries.map((entry) => entry.replace(/\/$/, ''))
    if (
      new Set(paths).size !== paths.length ||
      !entries.includes('package/package.json') ||
      paths.some(
        (entry) =>
          !entry.startsWith('package/') ||
          /[\\\x00-\x1f\x7f]/.test(entry) ||
          entry.split('/').some((part) => !part || part === '.' || part === '..') ||
          (entry.toLowerCase() === 'package/package.json' && entry !== 'package/package.json'),
      )
    )
      throw new Error('Noncanonical or duplicate archive paths, or missing package/package.json')
    const manifest = JSON.parse(tar(['--extract', '--gzip', '--to-stdout', 'package/package.json']))
    if (!manifest || manifest.name !== source.name || manifest.version !== source.version)
      throw new Error('Packaged name/version does not match committed source')
    if (Object.hasOwn(manifest, 'publishConfig'))
      throw new Error('Packaged publishConfig is forbidden')
  } catch (cause) {
    throw new Error(`${source.name}: invalid packaged manifest: ${cause.message}`, { cause })
  }
}

// Deliberately a narrow release policy, not a general SemVer implementation.
// Supported channels are X.Y.Z -> latest and X.Y.Z-beta.N -> beta.
const releaseVersion = (version) => {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.(0|[1-9]\d*))?$/.exec(version)
  if (!match) throw new Error(`Unsupported release version: ${version}`)
  return {
    parts: match.slice(1, 4).map(BigInt),
    beta: match[4],
    tag: match[4] === undefined ? 'latest' : 'beta',
  }
}

const newerThan = (left, right) => {
  const a = releaseVersion(left)
  const b = releaseVersion(right)
  for (let i = 0; i < 3; i++) {
    if (a.parts[i] !== b.parts[i]) return a.parts[i] > b.parts[i]
  }
  if (a.beta === undefined) return b.beta !== undefined
  if (b.beta === undefined) return false
  return BigInt(a.beta) > BigInt(b.beta)
}

const dependencyOrder = (packages) => {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]))
  const visiting = new Set()
  const visited = new Set()
  const ordered = []
  const visit = (pkg) => {
    if (visited.has(pkg.name)) return
    if (visiting.has(pkg.name)) throw new Error(`Internal dependency cycle at ${pkg.name}`)
    visiting.add(pkg.name)
    for (const name of pkg.dependencies.sort()) if (byName.has(name)) visit(byName.get(name))
    visiting.delete(pkg.name)
    visited.add(pkg.name)
    ordered.push(pkg)
  }
  packages.forEach(visit)
  return ordered
}

// Authenticate the whole bundle, then snapshot the verified bytes in our private
// temporary directory. npm never reads the download directory or repository config.
const prepareRelease = ({ repo, input, sourceCommit, manifestSha256, tag }, temporary) => {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit || ''))
    throw new Error('Expected a full source commit SHA')
  if (!/^[a-f0-9]{64}$/.test(manifestSha256 || ''))
    throw new Error('Expected an independent manifest SHA-256')
  if (git(repo, ['rev-parse', 'HEAD']) !== sourceCommit)
    throw new Error('Checkout does not match source commit')
  if (!fs.lstatSync(input).isDirectory()) throw new Error('Artifact input must be a real directory')
  const bytes = readFile(path.join(input, 'manifest.json'))
  if (hash(bytes, 'sha256', 'hex') !== manifestSha256)
    throw new Error('Assembly manifest digest mismatch')
  const record = JSON.parse(bytes)
  if (
    record.schemaVersion !== 1 ||
    record.sourceCommit !== sourceCommit ||
    !Array.isArray(record.packages)
  ) {
    throw new Error('Invalid assembly manifest or source commit')
  }
  // Policy comes from the reviewed commit, never working-tree edits or the build.
  const sourceJson = (file) => JSON.parse(git(repo, ['show', `${sourceCommit}:${file}`]))
  const { version } = sourceJson('lerna.json')
  if (!['latest', 'beta'].includes(tag) || releaseVersion(version).tag !== tag) {
    throw new Error('Release version does not match the explicit latest/beta channel')
  }
  const { packageDirectories } = sourceJson('scripts/release/package-layout.json')
  if (
    !Array.isArray(packageDirectories) ||
    !packageDirectories.length ||
    new Set(packageDirectories).size !== packageDirectories.length
  ) {
    throw new Error('Invalid package layout')
  }
  if (record.packages.length !== packageDirectories.length)
    throw new Error('Incomplete assembly manifest')
  const packages = packageDirectories.map((directory) => {
    if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(directory))
      throw new Error('Invalid package directory')
    const source = sourceJson(`packages/${directory}/package.json`)
    if (
      source.private ||
      !/^@autonomys\/[a-z0-9][a-z0-9._-]*$/.test(source.name) ||
      source.version !== version
    ) {
      throw new Error(`Invalid source package identity: ${directory}`)
    }
    const tarball = `${source.name.slice(1).replace('/', '-')}-${version}.tgz`
    const matches = record.packages.filter((pkg) => pkg.directory === directory)
    const pkg = matches[0]
    if (
      matches.length !== 1 ||
      pkg.name !== source.name ||
      pkg.version !== version ||
      pkg.tarball !== tarball
    ) {
      throw new Error(`Assembly package identity mismatch: ${directory}`)
    }
    const payload = readFile(path.join(input, tarball))
    if (integrity(payload) !== pkg.integrity)
      throw new Error(`Tarball integrity mismatch: ${pkg.name}`)
    const file = path.join(temporary, tarball)
    fs.writeFileSync(file, payload, { flag: 'wx', mode: 0o400 })
    verifyPackagedManifest(file, source)
    return {
      name: pkg.name,
      version,
      integrity: pkg.integrity,
      file,
      dependencies: Object.keys({
        ...source.dependencies,
        ...source.optionalDependencies,
        ...source.peerDependencies,
      }),
    }
  })
  if (new Set(packages.map((pkg) => pkg.name)).size !== packages.length)
    throw new Error('Duplicate package name')
  const expected = ['manifest.json', ...record.packages.map((pkg) => pkg.tarball)].sort()
  if (JSON.stringify(fs.readdirSync(input).sort()) !== JSON.stringify(expected))
    throw new Error('Unexpected artifact files')
  return { ...record, packages: dependencyOrder(packages) }
}

const githubEnvironment = (env, sourceCommit) => {
  if (
    env.GITHUB_ACTIONS !== 'true' ||
    env.GITHUB_SERVER_URL !== 'https://github.com' ||
    env.GITHUB_REPOSITORY !== 'autonomys/auto-sdk' ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    env.GITHUB_EVENT_NAME !== 'push' ||
    env.GITHUB_SHA !== sourceCommit ||
    env.GITHUB_WORKFLOW_SHA !== sourceCommit ||
    env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
    env.GITHUB_WORKFLOW_REF !== 'autonomys/auto-sdk/.github/workflows/release.yaml@refs/heads/main'
  )
    throw new Error(
      'Publishing requires the release workflow on the original main push and source commit',
    )
  // These are the variables used by npm's GitHub OIDC and provenance support.
  // Do not inherit tokens, npm config, proxies, NODE_OPTIONS, or alternate identity providers.
  const keys = [
    'GITHUB_ACTIONS',
    'GITHUB_SERVER_URL',
    'GITHUB_REPOSITORY',
    'GITHUB_REF',
    'GITHUB_EVENT_NAME',
    'GITHUB_SHA',
    'GITHUB_WORKFLOW_REF',
    'GITHUB_WORKFLOW_SHA',
    'GITHUB_REPOSITORY_ID',
    'GITHUB_REPOSITORY_OWNER_ID',
    'GITHUB_RUN_ID',
    'GITHUB_RUN_ATTEMPT',
    'RUNNER_ENVIRONMENT',
    'ACTIONS_ID_TOKEN_REQUEST_URL',
    'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  ]
  for (const key of keys)
    if (!env[key]) throw new Error(`Missing GitHub publishing context: ${key}`)
  return Object.fromEntries(keys.map((key) => [key, env[key]]))
}

// Keep publisher isolation self-contained: assembly helpers can change without
// silently changing the code that receives OIDC authority. Audit both explicitly.
const npmEnvironment = (temporary, env) => ({
  PATH: env.PATH,
  HOME: temporary,
  NPM_CONFIG_USERCONFIG: path.join(temporary, 'npmrc'),
  NPM_CONFIG_GLOBALCONFIG: path.join(temporary, 'global-npmrc'),
  NPM_CONFIG_CACHE: path.join(temporary, 'cache'),
})

// Public registry reads do not receive credentials. Only 404 means absent;
// network, authorization, rate-limit, server, redirect, and JSON errors stop the run.
const registryJson = async (relative, fetch) => {
  const response = await fetch(new URL(relative, REGISTRY), {
    redirect: 'error',
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(30_000),
  })
  if (response.status === 404) return undefined
  if (response.status !== 200)
    throw Object.assign(new Error(`Registry read failed (${response.status}): ${relative}`), {
      status: response.status,
    })
  const result = await response.json()
  if (!result || typeof result !== 'object' || Array.isArray(result))
    throw new Error(`Invalid registry JSON: ${relative}`)
  return result
}

const registryState = async (pkg, fetch) => {
  const metadata = await registryJson(`${encodeURIComponent(pkg.name)}/${pkg.version}`, fetch)
  if (metadata === undefined) return 'missing'
  if (
    metadata.name !== pkg.name ||
    metadata.version !== pkg.version ||
    metadata.dist?.integrity !== pkg.integrity
  ) {
    throw new Error(
      `Registry integrity/identity conflict: ${pkg.name}@${pkg.version}; do not overwrite or rebuild`,
    )
  }
  return 'matching'
}

const checkTag = async (pkg, tag, fetch) => {
  const bootstrap =
    'New packages need an initial manual publish and trusted-publisher setup before automated releases (see RELEASE.md)'
  let tags
  try {
    tags = await registryJson(`-/package/${encodeURIComponent(pkg.name)}/dist-tags`, fetch)
  } catch (cause) {
    // npm can return 401 for a package that has never been published. Do not
    // treat authorization failures as absence or attempt an authenticated retry.
    throw new Error(
      `${pkg.name}: cannot read ${tag} dist-tag: ${cause.message}${cause.status === 401 ? `. ${bootstrap}` : ''}`,
      { cause },
    )
  }
  if (tags === undefined) throw new Error(`${pkg.name}: no public dist-tags. ${bootstrap}`)
  if (tags[tag] === undefined) return
  let newer
  try {
    if (typeof tags[tag] !== 'string') throw new Error('Expected a version string')
    newer = newerThan(tags[tag], pkg.version)
  } catch (cause) {
    throw new Error(
      `${pkg.name}: unsupported existing ${tag} dist-tag ${JSON.stringify(tags[tag])}`,
      { cause },
    )
  }
  if (newer) {
    throw new Error(`Refusing to move ${pkg.name}'s ${tag} tag backwards from ${tags[tag]}`)
  }
}

const publishRelease = async (options, dependencies = {}) => {
  const {
    fetch = globalThis.fetch,
    run = execFileSync,
    env = process.env,
    log = console.log,
    wait = sleep,
  } = dependencies
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-sdk-publisher-'))
  try {
    const release = prepareRelease(options, temporary)
    if (!options.publish) {
      for (const pkg of release.packages)
        log(`Verified ${pkg.name}@${pkg.version} -> ${options.tag}`)
      log('Offline dry run: no registry requests, npm commands, or OIDC requests')
      return release.packages.map((pkg) => ({ name: pkg.name, status: 'verified' }))
    }
    const context = githubEnvironment(env, options.sourceCommit)
    const npmEnv = npmEnvironment(temporary, env)
    // Anchor npm's project lookup here rather than letting it search parent directories.
    fs.writeFileSync(path.join(temporary, 'package.json'), '{"private":true}\n')
    fs.writeFileSync(npmEnv.NPM_CONFIG_USERCONFIG, '')
    fs.writeFileSync(npmEnv.NPM_CONFIG_GLOBALCONFIG, '')
    const npmVersion = run('npm', ['--version'], {
      cwd: temporary,
      env: npmEnv,
      encoding: 'utf8',
    }).trim()
    if (release.nodeVersion !== process.version || release.npmVersion !== npmVersion) {
      throw new Error('Publisher must use the same pinned Node and npm versions as assembly')
    }
    // Check EVERY package before the first write, so a conflict late in the list
    // does not cause an avoidable partial release.
    for (const pkg of release.packages) {
      const state = await registryState(pkg, fetch)
      if (state === 'missing') await checkTag(pkg, options.tag, fetch)
    }
    const results = []
    for (const pkg of release.packages) {
      // Re-read immediately before publishing; another attempt may have finished.
      if ((await registryState(pkg, fetch)) === 'matching') {
        log(`Already published with matching integrity: ${pkg.name}@${pkg.version}`)
        results.push({ name: pkg.name, status: 'existing' })
        continue
      }
      await checkTag(pkg, options.tag, fetch)
      log(`Publishing ${pkg.name}@${pkg.version} -> ${options.tag}`)
      let publishFailed = false
      try {
        run(
          'npm',
          [
            'publish',
            pkg.file,
            `--registry=${REGISTRY}`,
            `--@autonomys:registry=${REGISTRY}`,
            '--access=public',
            `--tag=${options.tag}`,
            '--provenance',
            '--ignore-scripts',
            '--workspaces=false',
            '--fetch-retries=0',
            '--fetch-timeout=60000',
          ],
          { cwd: temporary, env: { ...npmEnv, ...context }, stdio: 'inherit', timeout: 300_000 },
        )
      } catch {
        // A failed command can mean the registry accepted the upload but the
        // response was lost. Inspect the registry; never retry the upload here.
        publishFailed = true
      }
      let visible = false
      for (const delay of [0, 1000, 2000, 4000]) {
        if (delay) await wait(delay)
        if ((await registryState(pkg, fetch)) === 'matching') {
          visible = true
          break
        }
      }
      if (!visible)
        throw new Error(
          `${pkg.name}@${pkg.version}: ${publishFailed ? 'publish failed' : 'upload not yet visible'}; rerun with the original artifact and source commit`,
        )
      log(`Verified published integrity: ${pkg.name}@${pkg.version}`)
      results.push({ name: pkg.name, status: 'published' })
    }
    return results
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}

if (require.main === module) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'source-commit': { type: 'string' },
      'manifest-sha256': { type: 'string' },
      tag: { type: 'string' },
      publish: { type: 'boolean', default: false },
    },
  })
  if (positionals.length !== 1) {
    console.error(
      'Usage: node scripts/release/publish.js <artifact-directory> --source-commit <sha> --manifest-sha256 <sha256> --tag <latest|beta> [--publish]',
    )
    process.exitCode = 1
  } else {
    publishRelease({
      repo: path.resolve(__dirname, '../..'),
      input: path.resolve(positionals[0]),
      sourceCommit: values['source-commit'],
      manifestSha256: values['manifest-sha256'],
      tag: values.tag,
      publish: values.publish,
    }).catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
  }
}

module.exports = {
  publishRelease,
  prepareRelease,
  githubEnvironment,
  dependencyOrder,
  registryState,
  checkTag,
}
