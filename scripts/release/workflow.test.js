const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { test } = require('node:test')
const {
  ASSEMBLY_JOB,
  PUBLISH_JOB,
  githubApi,
  nextVersion,
  planRelease,
  guardAssembly,
  finalizeRelease,
} = require('./workflow')
const { exportProposal, importProposal } = require('./proposal')

const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n')
}
const fixture = (t, version = '1.2.3') => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-sdk-workflow-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const repo = path.join(root, 'repo')
  fs.mkdirSync(repo)
  const git = (args) =>
    execFileSync('git', args, {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_AUTHOR_NAME: 'Test',
        GIT_COMMITTER_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.invalid',
        GIT_COMMITTER_EMAIL: 'test@example.invalid',
      },
    }).trim()
  git(['init', '--quiet'])
  const commit = () => {
    git(['add', '.'])
    git(['-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '--no-gpg-sign', '-m', 'fixture'])
    return git(['rev-parse', 'HEAD'])
  }
  const metadata = (version) => {
    write(path.join(repo, 'lerna.json'), { version, npmClient: 'yarn' })
    write(path.join(repo, 'scripts/release/package-layout.json'), {
      packageDirectories: ['base', 'app'],
    })
    write(path.join(repo, 'packages/base/package.json'), {
      name: '@autonomys/base',
      version,
      scripts: { prepare: 'must not run' },
    })
    write(path.join(repo, 'packages/app/package.json'), {
      name: '@autonomys/app',
      version,
      dependencies: { '@autonomys/base': `^${version}`, external: '^4.0.0' },
    })
    for (const name of ['examples', 'integration-tests'])
      write(path.join(repo, `${name}/package.json`), { name, version, private: true })
    write(
      path.join(repo, 'yarn.lock'),
      '# Reviewed lockfile\n' +
        ['^', '~', '']
          .map(
            (operator) =>
              `"@autonomys/base@npm:${operator}${version}, @autonomys/base@workspace:packages/base":\n` +
              '  version: 0.0.0-use.local\n  resolution: "@autonomys/base@workspace:packages/base"\n' +
              `  dependencies:\n    "@autonomys/base": "npm:${operator}${version}"\n\n`,
          )
          .join('') +
        '"external@npm:^4.0.0":\n  version: 4.0.0\n  resolution: "external@npm:4.0.0"\n  checksum: trusted\n',
    )
    write(
      path.join(repo, 'CHANGELOG.md'),
      `# Changelog\n\n## [Unreleased]\n\nFuture\n\n## [${version}] - 2026-10-21\n\nRelease notes\n\n## [1.0.0]\n\nOlder release\n`,
    )
  }
  metadata('1.2.2')
  const before = commit()
  git(['tag', 'v1.2.2'])
  metadata(version)
  const sha = commit()
  const env = {
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_REPOSITORY: 'autonomys/auto-sdk',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: sha,
    GITHUB_EVENT_NAME: 'push',
    BEFORE: before,
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '1',
    SOURCE_COMMIT: sha,
    ARTIFACT_ID: '456',
    MANIFEST_SHA256: 'a'.repeat(64),
  }
  const calls = []
  const state = { ref: undefined, release: undefined }
  const api = async (route, options = {}) => {
    calls.push({ route, ...options })
    if (route === 'releases/tags/v1.2.2') return { tag_name: 'v1.2.2', draft: false }
    if (route === `git/ref/tags/v${version}`) return state.ref
    if (route === 'git/refs')
      return (state.ref = { object: { type: 'commit', sha: options.body.sha } })
    if (route === `releases/tags/v${version}`) return state.release
    if (route === 'releases')
      return (state.release = {
        ...options.body,
        html_url: 'https://github.com/autonomys/auto-sdk/releases/tag/fixture',
      })
    assert.fail(`Unexpected GitHub call: ${route}`)
  }
  return { root, repo, git, metadata, commit, env, api, calls, state }
}

test('only the original version-changing main push plans publication', async (t) => {
  const f = fixture(t)
  assert.deepEqual(await planRelease(f), { version: '1.2.3', tag: 'latest', release: true })
  f.env.BEFORE = f.env.GITHUB_SHA
  f.calls.length = 0
  assert.equal((await planRelease(f)).release, false)
  assert.equal(f.calls.length, 0)
  f.env.GITHUB_EVENT_NAME = 'workflow_dispatch'
  assert.equal((await planRelease(f)).release, false)
})

test('beta merges select beta and a matching existing tag permits finalization recovery', async (t) => {
  const f = fixture(t, '1.2.3-beta.0')
  f.git(['tag', 'v1.2.3-beta.0'])
  assert.deepEqual(await planRelease(f), { version: '1.2.3-beta.0', tag: 'beta', release: true })
})

test('planning rejects edited or duplicate changelog headings before publication', async (t) => {
  for (const heading of ['## 1.2.3 - date', '## [1.2.3]\n\nNotes\n\n## [1.2.3]']) {
    const f = fixture(t)
    write(path.join(f.repo, 'CHANGELOG.md'), `# Changelog\n\n${heading}\n\nNotes\n`)
    f.env.GITHUB_SHA = f.commit()
    await assert.rejects(planRelease(f), /Expected one CHANGELOG.md section for 1.2.3/)
    assert.ok(f.calls.every((call) => !call.method))
  }
})

test('planning rejects conflicting GitHub releases and permits matching completed releases', async (t) => {
  for (const version of ['1.2.3', '1.2.3-beta.0']) {
    const f = fixture(t, version)
    const matching = { tag_name: `v${version}`, draft: false, prerelease: version.includes('-') }
    for (const override of [
      { draft: true },
      { tag_name: 'v9.9.9' },
      { prerelease: !matching.prerelease },
    ]) {
      f.state.release = { ...matching, ...override }
      await assert.rejects(planRelease(f), /conflicting GitHub release/)
    }
    f.state.release = matching
    assert.equal((await planRelease(f)).release, true)
    assert.ok(f.calls.every((call) => !call.method))
  }
})

test('planning refuses wrong context, rollback, incomplete prior releases and conflicting tags', async (t) => {
  for (const override of [
    { GITHUB_REF: 'refs/heads/feature' },
    { GITHUB_REPOSITORY: 'fork/auto-sdk' },
    { GITHUB_SHA: 'a'.repeat(40) },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { BEFORE: '0'.repeat(40) },
  ]) {
    const f = fixture(t)
    await assert.rejects(planRelease({ ...f, env: { ...f.env, ...override } }))
  }
  const rollback = fixture(t, '1.2.1')
  await assert.rejects(planRelease(rollback), /must increase/)
  const missing = fixture(t)
  missing.git(['tag', '-d', 'v1.2.2'])
  await assert.rejects(planRelease(missing), /has no tag/)
  const draft = fixture(t)
  await assert.rejects(
    planRelease({ ...draft, api: async () => ({ tag_name: 'v1.2.2', draft: true }) }),
    /no completed GitHub release/,
  )
  const conflict = fixture(t)
  conflict.git(['tag', 'v1.2.3', conflict.env.BEFORE])
  await assert.rejects(planRelease(conflict), /different commit/)
})

test('version choices support stable bumps, numeric betas and promotion without another bump', () => {
  for (const [from, type, to] of [
    ['1.2.3', 'patch', '1.2.4'],
    ['1.2.3', 'minor', '1.3.0'],
    ['1.2.3', 'major', '2.0.0'],
    ['1.2.3', 'prepatch', '1.2.4-beta.0'],
    ['1.2.3', 'preminor', '1.3.0-beta.0'],
    ['1.2.3', 'premajor', '2.0.0-beta.0'],
    ['1.2.3', 'prerelease', '1.2.4-beta.0'],
    ['1.2.4-beta.9', 'prerelease', '1.2.4-beta.10'],
    ['1.2.4-beta.10', 'patch', '1.2.4'],
    ['1.3.0-beta.1', 'minor', '1.3.0'],
    ['2.0.0-beta.1', 'major', '2.0.0'],
  ])
    assert.equal(nextVersion(from, type), to)
  assert.throws(() => nextVersion('1.2.3', 'unknown'), /Unsupported release type/)
  assert.throws(() => nextVersion('1.2.3-rc.0', 'patch'), /Unsupported release version/)
})

test('changelog preparation uses the original version after Lerna bumps it, and orders beta counters numerically', (t) => {
  const f = fixture(t, '1.3.0-beta.10')
  const script = path.join(f.repo, 'scripts/generate-pr-changelog.js')
  fs.copyFileSync(path.join(__dirname, '../generate-pr-changelog.js'), script)
  write(path.join(f.repo, 'node_modules/@octokit/rest/package.json'), {
    name: '@octokit/rest',
    type: 'commonjs',
    main: 'index.js',
  })
  // Exercise the real generator with a local API stub: no token or network access.
  write(
    path.join(f.repo, 'node_modules/@octokit/rest/index.js'),
    `
exports.Octokit = class {
  repos = {
    listTags: async () => ({ data: [
      { name: 'v1.3.0-beta.9', commit: { sha: 'beta' } },
      { name: 'v1.2.3', commit: { sha: 'stable' } },
    ] }),
    getCommit: async ({ ref }) => ({ data: { commit: { author: { date: ref === 'beta' ? '2026-10-20T00:00:00Z' : '2026-10-01T00:00:00Z' } } } }),
  }
  search = { issuesAndPullRequests: async ({ q }) => {
    require('node:fs').appendFileSync('queries.txt', q + '\\n')
    return { data: { items: [{ title: 'fix: fixture change', number: 123, html_url: 'https://github.com/autonomys/auto-sdk/pull/123', labels: [], user: { login: 'fixture', html_url: 'https://github.com/fixture' } }] } }
  } }
}
`,
  )
  write(
    path.join(f.repo, 'CHANGELOG.md'),
    '# Changelog\n\n## [1.3.0-beta.9]\n\nPrevious beta\n\n## [1.2.3]\n\nStable\n',
  )
  execFileSync(process.execPath, [script], {
    cwd: f.repo,
    env: {
      PATH: process.env.PATH,
      GITHUB_TOKEN: 'fixture-only',
      PREVIOUS_VERSION: '1.3.0-beta.9',
      RELEASE_VERSION: '1.3.0-beta.10',
    },
    stdio: 'pipe',
  })
  const notes = fs.readFileSync(path.join(f.repo, 'CHANGELOG.md'), 'utf8')
  assert.ok(notes.indexOf('## [1.3.0-beta.10]') < notes.indexOf('## [1.3.0-beta.9]'))
  assert.match(notes, /compare\/v1\.3\.0-beta\.9\.\.\.v1\.3\.0-beta\.10/)
  assert.match(
    fs.readFileSync(path.join(f.repo, 'queries.txt'), 'utf8'),
    /merged:2026-10-20T00:00:00\.000Z\.\.\*/,
  )
  // Promotion keeps the stable release above all of its beta sections.
  write(path.join(f.repo, 'queries.txt'), '')
  execFileSync(process.execPath, [script], {
    cwd: f.repo,
    env: {
      PATH: process.env.PATH,
      GITHUB_TOKEN: 'fixture-only',
      PREVIOUS_VERSION: '1.3.0-beta.9',
      RELEASE_VERSION: '1.3.0',
    },
    stdio: 'pipe',
  })
  const promoted = fs.readFileSync(path.join(f.repo, 'CHANGELOG.md'), 'utf8')
  assert.ok(promoted.indexOf('## [1.3.0]') < promoted.indexOf('## [1.3.0-beta.10]'))
  assert.match(promoted, /\[1\.3\.0\]: .*compare\/v1\.2\.3\.\.\.v1\.3\.0/)
  assert.match(
    fs.readFileSync(path.join(f.repo, 'queries.txt'), 'utf8').split('\n')[0],
    /merged:2026-10-01T00:00:00\.000Z\.\.\*/,
  )
})

test('stable promotion finds the last stable tag beyond a full page of betas and includes beta-period changes', (t) => {
  const f = fixture(t, '1.3.0-beta.99')
  const script = path.join(f.repo, 'scripts/generate-pr-changelog.js')
  fs.copyFileSync(path.join(__dirname, '../generate-pr-changelog.js'), script)
  write(path.join(f.repo, 'node_modules/@octokit/rest/package.json'), {
    name: '@octokit/rest',
    type: 'commonjs',
    main: 'index.js',
  })
  write(
    path.join(f.repo, 'node_modules/@octokit/rest/index.js'),
    `
exports.Octokit = class {
  repos = {
    listTags: async ({ page }) => {
      require('node:fs').appendFileSync('pages.txt', page + '\\n')
      return { data: page === 1
        ? Array.from({ length: 100 }, (_, i) => ({ name: 'v1.3.0-beta.' + (99 - i), commit: { sha: 'beta' } }))
        : [{ name: 'v1.2.3', commit: { sha: 'stable' } }] }
    },
    getCommit: async ({ ref }) => ({ data: { commit: { author: { date: ref === 'stable' ? '2026-10-01T00:00:00Z' : '2026-10-20T00:00:00Z' } } } }),
  }
  search = { issuesAndPullRequests: async ({ q, page }) => {
    if (!q.includes('merged:2026-10-01T00:00:00.000Z..*')) return { data: { items: [] } }
    require('node:fs').appendFileSync('search-pages.txt', page + '\\n')
    const pr = { title: 'feat: change shipped in an earlier beta', number: 123, html_url: 'https://github.com/autonomys/auto-sdk/pull/123', labels: [], user: { login: 'fixture', html_url: 'https://github.com/fixture' } }
    return { data: { total_count: 101, items: page === 1
      ? Array.from({ length: 100 }, (_, i) => ({ ...pr, number: i + 1, title: 'fix: first-page change ' + i }))
      : [pr] } }
  } }
}
`,
  )
  execFileSync(process.execPath, [script], {
    cwd: f.repo,
    env: {
      PATH: process.env.PATH,
      GITHUB_TOKEN: 'fixture-only',
      PREVIOUS_VERSION: '1.3.0-beta.99',
      RELEASE_VERSION: '1.3.0',
    },
    stdio: 'pipe',
  })
  const notes = fs.readFileSync(path.join(f.repo, 'CHANGELOG.md'), 'utf8')
  const stable = notes.split('## [1.3.0]')[1].split('## [')[0]
  assert.match(stable, /change shipped in an earlier beta/)
  assert.match(notes, /\[1\.3\.0\]: .*compare\/v1\.2\.3\.\.\.v1\.3\.0/)
  assert.equal(fs.readFileSync(path.join(f.repo, 'pages.txt'), 'utf8'), '1\n2\n')
  assert.equal(fs.readFileSync(path.join(f.repo, 'search-pages.txt'), 'utf8'), '1\n2\n')

  // Missing tags must not silently fall back to the preceding beta or today's date.
  write(
    path.join(f.repo, 'node_modules/@octokit/rest/index.js'),
    `
exports.Octokit = class {
  repos = { listTags: async () => ({ data: [{ name: 'v1.3.0-beta.99', commit: { sha: 'beta' } }] }) }
}
`,
  )
  assert.throws(
    () =>
      execFileSync(process.execPath, [script], {
        cwd: f.repo,
        env: {
          PATH: process.env.PATH,
          GITHUB_TOKEN: 'fixture-only',
          PREVIOUS_VERSION: '1.3.0-beta.99',
          RELEASE_VERSION: '1.3.0',
        },
        stdio: 'pipe',
      }),
    /Cannot find changelog baseline/,
  )
  assert.equal(fs.readFileSync(path.join(f.repo, 'CHANGELOG.md'), 'utf8'), notes)
})

test('retry guard job names match the production workflow', () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, '../../.github/workflows/release.yaml'),
    'utf8',
  )
  for (const [id, expected] of [
    ['assemble', ASSEMBLY_JOB],
    ['publish', PUBLISH_JOB],
  ]) {
    const blocks = workflow.split(`\n  ${id}:\n`)
    assert.equal(blocks.length, 2, `Expected one ${id} job`)
    const block = blocks[1].split(/\n  \S/)[0]
    const names = [...block.matchAll(/^    name: (.+)$/gm)]
    assert.equal(names.length, 1, `Expected one name for ${id}`)
    assert.equal(names[0][1], expected, `${id} must retain the name used by guardAssembly`)
  }
})

test('rebuild guard permits initial attempts and retries before assembly succeeded', async () => {
  const env = { GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' }
  await guardAssembly({ env, api: () => assert.fail('first attempt needs no history') })
  env.GITHUB_RUN_ATTEMPT = '2'
  await guardAssembly({
    env,
    api: async () => ({
      total_count: 3,
      jobs: [
        {
          name: 'Assemble release packages',
          run_attempt: 1,
          status: 'completed',
          conclusion: 'failure',
        },
        {
          name: 'Publish verified packages',
          run_attempt: 1,
          status: 'completed',
          conclusion: 'skipped',
        },
        {
          name: 'Assemble release packages',
          run_attempt: 2,
          status: 'in_progress',
          conclusion: null,
        },
      ],
    }),
  })
})

test('rebuild guard searches all pages and stops after sealing or a publish attempt', async () => {
  for (const job of [
    {
      name: 'Assemble release packages',
      run_attempt: 1,
      conclusion: 'success',
      status: 'completed',
    },
    {
      name: 'Publish verified packages',
      run_attempt: 1,
      conclusion: 'failure',
      status: 'completed',
    },
    {
      name: 'Publish verified packages',
      run_attempt: 1,
      conclusion: 'cancelled',
      status: 'completed',
    },
  ]) {
    const routes = []
    const api = async (route) => {
      routes.push(route)
      return {
        total_count: 2,
        jobs: [routes.length === 1 ? { name: 'Build release packages', run_attempt: 2 } : job],
      }
    }
    await assert.rejects(
      guardAssembly({ env: { GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '3' }, api }),
      /artifacts are sealed/,
    )
    assert.equal(routes.length, 2)
    assert.match(routes[1], /filter=all&per_page=100&page=2$/)
  }
})

test('unavailable or malformed retry history never allows a rebuild', async () => {
  const env = { GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2' }
  for (const result of [
    {},
    { total_count: 1, jobs: [] },
    { total_count: 1, jobs: [{ name: 'Assemble release packages' }] },
  ])
    await assert.rejects(guardAssembly({ env, api: async () => result }))
  await assert.rejects(
    guardAssembly({
      env,
      api: async () => {
        throw new Error('API unavailable')
      },
    }),
    /API unavailable/,
  )
})

test('finalization creates only the exact commit tag and current release notes; retries are read-only', async (t) => {
  const f = fixture(t)
  await finalizeRelease(f)
  assert.equal(f.state.ref.object.sha, f.env.GITHUB_SHA)
  assert.equal(f.state.release.tag_name, 'v1.2.3')
  assert.equal(f.state.release.make_latest, 'true')
  assert.match(f.state.release.body, /Release notes/)
  assert.match(f.state.release.body, /artifacts\/456/)
  assert.doesNotMatch(f.state.release.body, /Older release|Future/)
  f.calls.length = 0
  await finalizeRelease(f)
  assert.ok(f.calls.every((call) => !call.method))
})

test('finalization resumes after a tag was created but release creation failed', async (t) => {
  const f = fixture(t)
  const api = f.api
  await assert.rejects(
    finalizeRelease({
      ...f,
      api: (route, options) => {
        if (route === 'releases') throw new Error('lost connection')
        return api(route, options)
      },
    }),
    /lost connection/,
  )
  assert.ok(f.state.ref)
  f.calls.length = 0
  await finalizeRelease(f)
  assert.deepEqual(
    f.calls.filter((call) => call.method).map((call) => call.route),
    ['releases'],
  )
})

test('beta finalization never promotes latest and accepts an annotated tag at the original commit', async (t) => {
  const f = fixture(t, '1.2.3-beta.0')
  f.state.ref = { object: { type: 'tag', sha: 'b'.repeat(40) } }
  const api = f.api
  await finalizeRelease({
    ...f,
    api: (route, options) =>
      route.startsWith('git/tags/')
        ? { object: { type: 'commit', sha: f.env.GITHUB_SHA } }
        : api(route, options),
  })
  assert.equal(f.state.release.prerelease, true)
  assert.equal(f.state.release.make_latest, 'false')
})

test('finalization fails closed on wrong tags, conflicting releases and missing trusted identity', async (t) => {
  const f = fixture(t)
  f.state.ref = { object: { type: 'commit', sha: f.env.BEFORE } }
  await assert.rejects(finalizeRelease(f), /different commit/)
  assert.ok(f.calls.every((call) => !call.method))
  f.state.ref = { object: { type: 'commit', sha: f.env.GITHUB_SHA } }
  f.state.release = { tag_name: 'v1.2.3', draft: true, prerelease: false }
  await assert.rejects(finalizeRelease(f), /conflicting GitHub release/)
  for (const override of [
    { SOURCE_COMMIT: f.env.BEFORE },
    { ARTIFACT_ID: '' },
    { MANIFEST_SHA256: '' },
    { GITHUB_EVENT_NAME: 'workflow_dispatch' },
  ])
    await assert.rejects(
      finalizeRelease({ ...f, env: { ...f.env, ...override } }),
      /Missing trusted publication identity/,
    )
})

test('a tag creation race is checked for exact commit identity', async (t) => {
  for (const matching of [true, false]) {
    const f = fixture(t)
    const api = f.api
    f.api = async (route, options) => {
      if (route === 'git/refs') {
        f.state.ref = {
          object: { type: 'commit', sha: matching ? f.env.GITHUB_SHA : f.env.BEFORE },
        }
        throw Object.assign(new Error('already exists'), { status: 422 })
      }
      return api(route, options)
    }
    if (matching) await finalizeRelease(f)
    else await assert.rejects(finalizeRelease(f), /different commit/)
  }
})

test('GitHub API requests use a fixed origin, forbid redirects and distinguish absence from failures', async () => {
  let seen
  const api = githubApi('fixture-token', async (url, options) => {
    seen = { url, options }
    return new Response('{}', { status: 200 })
  })
  await api('git/refs', { method: 'POST', body: { ref: 'fixture' } })
  assert.equal(seen.url, 'https://api.github.com/repos/autonomys/auto-sdk/git/refs')
  assert.equal(seen.options.redirect, 'error')
  assert.equal(seen.options.headers.authorization, 'Bearer fixture-token')
  assert.equal(seen.options.body, '{"ref":"fixture"}')
  for (const status of [401, 403, 429, 500])
    await assert.rejects(
      githubApi('fixture-token', async () => new Response('{}', { status }))(
        'releases/tags/v1.2.3',
        { optional: true },
      ),
      /HTTP/,
    )
  assert.equal(
    await githubApi('fixture-token', async () => new Response('{}', { status: 404 }))(
      'releases/tags/v1.2.3',
      { optional: true },
    ),
    undefined,
  )
})

const proposalFixture = (t, previous = '1.2.3', type = 'patch') => {
  const f = fixture(t, previous)
  f.metadata(nextVersion(previous, type))
  const input = path.join(f.root, 'proposal')
  exportProposal({ ...f, output: input, sourceCommit: f.env.GITHUB_SHA })
  f.git(['reset', '--hard', 'HEAD']) // disposable fixture only
  const options = { repo: f.repo, input, sourceCommit: f.env.GITHUB_SHA, type }
  return { ...f, options, input }
}

test('preparation exports data without committing and a clean writer imports only the requested release metadata', (t) => {
  const f = proposalFixture(t)
  const result = importProposal(f.options)
  assert.equal(result.version, '1.2.4')
  assert.equal(f.git(['rev-parse', 'HEAD']), f.env.GITHUB_SHA)
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(f.repo, 'packages/base/package.json'))).scripts.prepare,
    'must not run',
  )
  assert.ok(
    f
      .git(['diff', '--name-only'])
      .split('\n')
      .every((file) => result.files.includes(file)),
  )
})

test('proposal lockfiles permit only exact, caret and tilde internal rewrites for stable and beta bumps', (t) => {
  for (const [previous, type] of [
    ['1.2.3', 'patch'],
    ['1.2.3', 'preminor'],
    ['1.3.0-beta.9', 'prerelease'],
    ['1.3.0-beta.9', 'patch'],
  ]) {
    const f = proposalFixture(t, previous, type)
    const { version } = importProposal(f.options)
    const lockfile = fs.readFileSync(path.join(f.repo, 'yarn.lock'), 'utf8')
    for (const operator of ['^', '~', '']) {
      assert.ok(lockfile.includes(`@autonomys/base@npm:${operator}${version},`))
      assert.ok(lockfile.includes(`"@autonomys/base": "npm:${operator}${version}"`))
    }
    assert.ok(lockfile.includes('resolution: "@autonomys/base@workspace:packages/base"'))
    assert.ok(
      lockfile.includes(
        '"external@npm:^4.0.0":\n  version: 4.0.0\n  resolution: "external@npm:4.0.0"\n  checksum: trusted\n',
      ),
    )
  }
})

for (const [kind, change] of [
  [
    'new package',
    (text) =>
      text +
      '\n"left-pad@npm:^1.3.0":\n  resolution: "left-pad@https://attacker.invalid/left-pad-1.3.0.tgz"\n',
  ],
  [
    'resolution',
    (text) =>
      text.replace(
        'resolution: "external@npm:4.0.0"',
        'resolution: "external@https://attacker.invalid/external.tgz"',
      ),
  ],
  ['checksum', (text) => text.replace('checksum: trusted', 'checksum: attacker')],
  ['external range', (text) => text.replace('external@npm:^4.0.0', 'external@npm:^5.0.0')],
  [
    'missing internal bump',
    (text) => text.replace('@autonomys/base@npm:^1.2.4', '@autonomys/base@npm:^1.2.3'),
  ],
  [
    'changed range operator',
    (text) => text.replace('@autonomys/base@npm:^1.2.4', '@autonomys/base@npm:~1.2.4'),
  ],
]) {
  test(`proposal writer rejects lockfile ${kind} without changing tracked files`, (t) => {
    const f = proposalFixture(t)
    const file = path.join(f.input, 'proposal.json')
    const proposal = JSON.parse(fs.readFileSync(file))
    proposal.files['yarn.lock'] = change(proposal.files['yarn.lock'])
    write(file, proposal)
    assert.throws(() => importProposal(f.options), /Unexpected yarn.lock changes/)
    assert.equal(f.git(['status', '--porcelain']), '')
  })
}

for (const kind of [
  'wrong source',
  'wrong bump',
  'workflow',
  'traversal',
  'package script',
  'external dependency',
  'missing file',
  'extra artifact',
  'symlink',
]) {
  test(`proposal writer rejects ${kind} without changing tracked files`, (t) => {
    const f = proposalFixture(t)
    const file = path.join(f.input, 'proposal.json')
    const proposal = JSON.parse(fs.readFileSync(file))
    if (kind === 'wrong source') proposal.sourceCommit = f.env.BEFORE
    if (kind === 'wrong bump') f.options.type = 'minor'
    if (kind === 'workflow') proposal.files['.github/workflows/release.yaml'] = 'malicious'
    if (kind === 'traversal') proposal.files['../outside'] = 'malicious'
    if (kind === 'missing file') delete proposal.files['yarn.lock']
    if (kind === 'package script' || kind === 'external dependency') {
      const name = kind === 'package script' ? 'base' : 'app'
      const manifest = JSON.parse(proposal.files[`packages/${name}/package.json`])
      if (kind === 'package script') manifest.scripts.prepare = 'malicious'
      else manifest.dependencies.external = '^99.0.0'
      proposal.files[`packages/${name}/package.json`] = JSON.stringify(manifest)
    }
    write(file, proposal)
    if (kind === 'extra artifact') write(path.join(f.input, 'extra'), 'malicious')
    if (kind === 'symlink') {
      fs.renameSync(file, path.join(f.root, 'outside'))
      fs.symlinkSync(path.join(f.root, 'outside'), file)
    }
    assert.throws(() => importProposal(f.options))
    assert.equal(f.git(['status', '--porcelain']), '')
  })
}
