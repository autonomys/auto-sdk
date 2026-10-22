#!/usr/bin/env node

// Preparation runs Lerna/changelog code without write authority. A fresh job
// imports only these fixed data files and proposes a branch for human review.
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { isDeepStrictEqual } = require('node:util')
const { context, nextVersion, releaseNotes } = require('./workflow')
const git = (repo, args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim()

const proposalFiles = (repo) => {
  const { packageDirectories } = JSON.parse(
    fs.readFileSync(path.join(repo, 'scripts/release/package-layout.json')),
  )
  if (
    !Array.isArray(packageDirectories) ||
    !packageDirectories.length ||
    packageDirectories.some((directory) => !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(directory))
  )
    throw new Error('Invalid package layout')
  const files = [
    'CHANGELOG.md',
    'lerna.json',
    'yarn.lock',
    'examples/package.json',
    'integration-tests/package.json',
    ...packageDirectories.map((directory) => `packages/${directory}/package.json`),
  ]
  if (new Set(files).size !== files.length) throw new Error('Duplicate proposal file')
  return files
}
const regularFile = (file) => {
  const stat = fs.lstatSync(file)
  if (!stat.isFile() || stat.nlink !== 1 || stat.size > 10 * 1024 * 1024)
    throw new Error(`Invalid proposal file: ${file}`)
  return fs.readFileSync(file, 'utf8')
}
// Derive the entire expected lockfile from reviewed source. Only internal npm
// descriptors and dependency ranges may change; resolutions and all other bytes
// must remain identical. No parser or code from the preparation job is used.
const releaseLockfile = (original, internal, previous, version) =>
  original
    .split('\n')
    .map((line) => {
      if (line.startsWith('"') && line.endsWith('\":'))
        return line.replace(
          /(^"|, )([^", ]+)@npm:([~^]?)([^", ]+)(?=, |":$)/g,
          (match, prefix, name, operator, range) =>
            internal.has(name) && range === previous
              ? `${prefix}${name}@npm:${operator}${version}`
              : match,
        )
      return line.replace(
        /^(    "([^"]+)": "npm:)([~^]?)([^"]+)(")$/,
        (match, prefix, name, operator, range, suffix) =>
          internal.has(name) && range === previous
            ? `${prefix}${operator}${version}${suffix}`
            : match,
      )
    })
    .join('\n')
const exportProposal = ({ repo, output, sourceCommit }) => {
  const files = proposalFiles(repo)
  if (git(repo, ['rev-parse', 'HEAD']) !== sourceCommit)
    throw new Error('Preparation changed its source commit')
  const changed = git(repo, ['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean)
  if (changed.some((file) => !files.includes(file)))
    throw new Error('Preparation changed files outside release metadata')
  const contents = Object.fromEntries(
    files.map((file) => [file, regularFile(path.join(repo, file))]),
  )
  fs.mkdirSync(output)
  fs.writeFileSync(
    path.join(output, 'proposal.json'),
    JSON.stringify({ sourceCommit, files: contents }),
  )
}
const importProposal = ({ repo, input, sourceCommit, type }) => {
  if (git(repo, ['rev-parse', 'HEAD']) !== sourceCommit || git(repo, ['status', '--porcelain']))
    throw new Error('Proposal writer requires a clean checkout of the original source commit')
  if (
    !fs.lstatSync(input).isDirectory() ||
    JSON.stringify(fs.readdirSync(input)) !== '["proposal.json"]'
  )
    throw new Error('Unexpected proposal artifact files')
  const proposal = JSON.parse(regularFile(path.join(input, 'proposal.json')))
  const files = proposalFiles(repo)
  if (
    proposal.sourceCommit !== sourceCommit ||
    !proposal.files ||
    !isDeepStrictEqual(Object.keys(proposal.files).sort(), [...files].sort()) ||
    Object.values(proposal.files).some((value) => typeof value !== 'string')
  )
    throw new Error('Invalid release proposal or source commit')
  const before = JSON.parse(regularFile(path.join(repo, 'lerna.json')))
  const version = nextVersion(before.version, type)
  if (!isDeepStrictEqual(JSON.parse(proposal.files['lerna.json']), { ...before, version }))
    throw new Error('Proposed lerna.json does not match the requested version bump')
  const manifests = files.filter((file) => file.endsWith('/package.json'))
  const sources = new Map(
    manifests.map((file) => [file, JSON.parse(regularFile(path.join(repo, file)))]),
  )
  const internal = new Set([...sources.values()].map((pkg) => pkg.name))
  const expectedLockfile = releaseLockfile(
    regularFile(path.join(repo, 'yarn.lock')),
    internal,
    before.version,
    version,
  )
  if (proposal.files['yarn.lock'] !== expectedLockfile)
    throw new Error(
      'Unexpected yarn.lock changes: only internal release version rewrites are allowed',
    )
  for (const [file, source] of sources) {
    const proposed = JSON.parse(proposal.files[file])
    if (proposed.version !== version) throw new Error(`Incorrect package version: ${file}`)
    const expected = { ...source, version }
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      if (!source[field]) continue
      expected[field] = { ...source[field] }
      for (const [name, range] of Object.entries(source[field])) {
        const target = proposed[field]?.[name]
        if (range === target) continue
        if (!internal.has(name) || ![version, `^${version}`, `~${version}`].includes(target))
          throw new Error(`Unexpected dependency change: ${file} ${name}`)
        expected[field][name] = target
      }
    }
    if (!isDeepStrictEqual(proposed, expected))
      throw new Error(`Unexpected package metadata changes: ${file}`)
  }
  // Never apply a patch, unpack a tree, copy executable files, or import workflow
  // code from the preparation job. Existing tracked destinations are regular files.
  for (const file of files) {
    regularFile(path.join(repo, file))
    if (git(repo, ['ls-files', '--error-unmatch', '--', file]) !== file)
      throw new Error(`Untracked proposal destination: ${file}`)
  }
  const notes = proposal.files['CHANGELOG.md']
    .split(/(?=^## \[)/m)
    .filter((section) => section.startsWith(`## [${version}]`))
  if (notes.length !== 1) throw new Error(`Expected changelog notes for ${version}`)
  for (const file of files) fs.writeFileSync(path.join(repo, file), proposal.files[file])
  return { version, files }
}

if (require.main === module) {
  try {
    const repo = path.resolve(__dirname, '../..')
    const env = process.env
    context(repo, env)
    if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch')
      throw new Error('Release preparation requires manual dispatch')
    const input = path.resolve(process.argv[3])
    if (process.argv[2] === 'export')
      exportProposal({ repo, output: input, sourceCommit: env.GITHUB_SHA })
    else if (process.argv[2] === 'push') {
      const { version, files } = importProposal({
        repo,
        input,
        sourceCommit: env.GITHUB_SHA,
        type: env.RELEASE_TYPE,
      })
      releaseNotes(repo, version)
      const branch = `chore-v${version}`
      const existing = git(repo, ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`])
      if (existing)
        throw new Error(
          `${branch} already exists; review that release proposal rather than replacing it`,
        )
      git(repo, ['switch', '-c', branch])
      git(repo, ['add', '--', ...files])
      git(repo, [
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=github-actions[bot]',
        '-c',
        'user.email=41898282+github-actions[bot]@users.noreply.github.com',
        'commit',
        '-m',
        `chore: release v${version}`,
      ])
      git(repo, ['push', 'origin', `HEAD:refs/heads/${branch}`])
      const url = `https://github.com/autonomys/auto-sdk/compare/main...${branch}?expand=1&title=${encodeURIComponent(`chore: release v${version}`)}`
      fs.appendFileSync(
        env.GITHUB_STEP_SUMMARY,
        `[Open the release PR for v${version}](${url})\n\nReview the changelog and version changes. Merging publishes from main after environment approval.\n`,
      )
      console.log(url)
    } else throw new Error('Expected export or push')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}

module.exports = { proposalFiles, exportProposal, importProposal }
