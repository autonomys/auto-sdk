const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { test } = require('node:test')
const { publishRelease } = require('./publish')

const digest = (bytes, algorithm = 'sha256', encoding = 'hex') =>
  crypto.createHash(algorithm).update(bytes).digest(encoding)
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value))
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status })
const names = ['app', 'base', 'optional', 'peer']
const order = ['base', 'optional', 'peer', 'app'].map((name) => `@autonomys/${name}`)
const pack = (directory, entries = ['package/package.json']) =>
  execFileSync(
    'tar',
    ['--create', '--gzip', '--format=ustar', '--file', '-', '-C', directory, ...entries],
    {
      env: { PATH: process.env.PATH, COPYFILE_DISABLE: '1' },
    },
  )

// Registry and npm are fakes. No test can obtain a credential or publish a package.
// Archive fixtures are real tarballs; assembly/npm packing is also covered below.
const fixture = (t, version = '1.2.3') => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-sdk-publisher-test-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const repo = path.join(root, 'repo')
  const input = path.join(root, 'artifact')
  const source = names.map((name) => ({
    name: `@autonomys/${name}`,
    version,
    main: 'dist/index.js',
    files: ['dist'],
    ...(name === 'app'
      ? {
          dependencies: { '@autonomys/base': `^${version}` },
          optionalDependencies: { '@autonomys/optional': `^${version}` },
          peerDependencies: { '@autonomys/peer': `>=${version}` },
        }
      : { devDependencies: { '@autonomys/app': `^${version}` } }),
  }))
  write(path.join(repo, 'lerna.json'), { version })
  write(path.join(repo, 'scripts/release/package-layout.json'), { packageDirectories: names })
  write(path.join(repo, 'LICENSE'), 'MIT fixture\n')
  for (const [i, name] of names.entries())
    write(path.join(repo, 'packages', name, 'package.json'), source[i])
  const git = (args) =>
    execFileSync('git', args, {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.invalid',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.invalid',
      },
    }).trim()
  git(['init', '--quiet'])
  const commit = () => {
    git(['add', '.'])
    git(['-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '--no-gpg-sign', '-m', 'fixture'])
    return git(['rev-parse', 'HEAD'])
  }
  const sourceCommit = commit()
  const record = {
    schemaVersion: 1,
    sourceCommit,
    nodeVersion: process.version,
    npmVersion: 'fixture-npm',
    packages: source.map((pkg, i) => {
      const tarball = `autonomys-${names[i]}-${version}.tgz`
      const staging = path.join(root, 'packing', names[i])
      write(path.join(staging, 'package/package.json'), pkg)
      const bytes = pack(staging)
      fs.mkdirSync(input, { recursive: true })
      fs.writeFileSync(path.join(input, tarball), bytes)
      return {
        name: pkg.name,
        version,
        directory: names[i],
        tarball,
        integrity: `sha512-${digest(bytes, 'sha512', 'base64')}`,
        files: [],
      }
    }),
  }
  const saveManifest = () => {
    write(path.join(input, 'manifest.json'), record)
    return digest(fs.readFileSync(path.join(input, 'manifest.json')))
  }
  const options = {
    repo,
    input,
    sourceCommit,
    manifestSha256: saveManifest(),
    tag: version.includes('-') ? 'beta' : 'latest',
    publish: true,
  }
  const env = {
    PATH: process.env.PATH,
    GITHUB_ACTIONS: 'true',
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_REPOSITORY: 'autonomys/auto-sdk',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_SHA: sourceCommit,
    GITHUB_WORKFLOW_SHA: sourceCommit,
    GITHUB_WORKFLOW_REF: 'autonomys/auto-sdk/.github/workflows/release.yaml@refs/heads/main',
    GITHUB_REPOSITORY_ID: '123',
    GITHUB_REPOSITORY_OWNER_ID: '456',
    GITHUB_RUN_ID: '789',
    GITHUB_RUN_ATTEMPT: '1',
    RUNNER_ENVIRONMENT: 'github-hosted',
    ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.invalid/oidc',
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'fixture-only',
    NODE_AUTH_TOKEN: 'must-not-inherit',
    NPM_TOKEN: 'must-not-inherit',
    NPM_ID_TOKEN: 'must-not-inherit',
    SIGSTORE_ID_TOKEN: 'must-not-inherit',
    GITHUB_TOKEN: 'must-not-inherit',
    NODE_OPTIONS: '--require=evil.js',
    npm_config_registry: 'https://example.invalid',
    NPM_CONFIG_PROXY: 'https://example.invalid',
    HTTPS_PROXY: 'https://example.invalid',
    HOME: repo,
  }
  const registry = new Map()
  const tags = new Map()
  const calls = []
  const reads = []
  const logs = []
  const waits = []
  const metadata = (pkg) => ({
    name: pkg.name,
    version: pkg.version,
    dist: { integrity: pkg.integrity },
  })
  const dependencies = {
    env,
    log: (message) => logs.push(message),
    wait: async (delay) => waits.push(delay),
    fetch: async (url, init) => {
      assert.equal(url.origin, 'https://registry.npmjs.org')
      assert.equal(init.redirect, 'error')
      assert.equal(init.headers.authorization, undefined)
      assert.equal(init.method, undefined)
      reads.push(url.href)
      if (url.pathname.startsWith('/-/package/')) {
        const name = decodeURIComponent(
          url.pathname.slice('/-/package/'.length, -'/dist-tags'.length),
        )
        return json(tags.get(name) || {})
      }
      const name = decodeURIComponent(url.pathname.split('/')[1])
      return registry.has(name) ? json(registry.get(name)) : json({ error: 'not found' }, 404)
    },
    run: (command, args, config) => {
      assert.equal(command, 'npm')
      calls.push({ args, config })
      if (args[0] === '--version') return 'fixture-npm\n'
      assert.equal(args[0], 'publish')
      const pkg = record.packages.find((pkg) => pkg.tarball === path.basename(args[1]))
      assert.ok(pkg)
      assert.equal(`sha512-${digest(fs.readFileSync(args[1]), 'sha512', 'base64')}`, pkg.integrity)
      registry.set(pkg.name, metadata(pkg))
    },
  }
  return {
    root,
    repo,
    input,
    source,
    record,
    options,
    dependencies,
    calls,
    reads,
    logs,
    waits,
    registry,
    tags,
    metadata,
    saveManifest,
    commit,
  }
}
const publishCalls = (f) => f.calls.filter(({ args }) => args[0] === 'publish')

test('publishes verified tarballs in runtime/optional/peer dependency order with isolated npm config', async (t) => {
  const f = fixture(t)
  const run = f.dependencies.run
  f.dependencies.run = (command, args, config) => {
    assert.notEqual(config.cwd, f.repo)
    assert.notEqual(config.cwd, f.input)
    for (const key of [
      'NODE_OPTIONS',
      'NODE_AUTH_TOKEN',
      'NPM_TOKEN',
      'NPM_ID_TOKEN',
      'SIGSTORE_ID_TOKEN',
      'GITHUB_TOKEN',
      'npm_config_registry',
      'NPM_CONFIG_PROXY',
      'HTTPS_PROXY',
    ]) {
      assert.equal(config.env[key], undefined, key)
    }
    assert.equal(fs.readFileSync(config.env.NPM_CONFIG_USERCONFIG, 'utf8'), '')
    assert.equal(fs.readFileSync(config.env.NPM_CONFIG_GLOBALCONFIG, 'utf8'), '')
    if (args[0] === 'publish') {
      assert.deepEqual(args.slice(2), [
        '--registry=https://registry.npmjs.org/',
        '--@autonomys:registry=https://registry.npmjs.org/',
        '--access=public',
        '--tag=latest',
        '--provenance',
        '--ignore-scripts',
        '--workspaces=false',
        '--fetch-retries=0',
        '--fetch-timeout=60000',
      ])
      assert.equal(config.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, 'fixture-only')
      assert.equal(config.env.GITHUB_SHA, f.options.sourceCommit)
      assert.equal(config.timeout, 300_000)
    } else {
      assert.equal(config.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, undefined)
    }
    return run(command, args, config)
  }
  const result = await publishRelease(f.options, f.dependencies)
  assert.deepEqual(
    result,
    order.map((name) => ({ name, status: 'published' })),
  )
  assert.equal(publishCalls(f).length, 4)
  assert.equal(fs.existsSync(f.calls[0].config.cwd), false, 'private snapshot is cleaned up')
})

test('default dry run validates the bundle but never runs npm or accesses the network', async (t) => {
  const f = fixture(t)
  delete f.options.publish
  f.dependencies.env = {}
  f.dependencies.fetch = f.dependencies.run = () => assert.fail('dry run must be offline')
  const result = await publishRelease(f.options, f.dependencies)
  assert.deepEqual(
    result,
    order.map((name) => ({ name, status: 'verified' })),
  )
})

test('a partial release resumes using original bytes, skipping matching versions without changing tags', async (t) => {
  const f = fixture(t)
  const run = f.dependencies.run
  f.dependencies.run = (command, args, config) => {
    if (args[0] === 'publish' && args[1].includes('autonomys-app-'))
      throw new Error('failed upload')
    return run(command, args, config)
  }
  await assert.rejects(
    publishRelease(f.options, f.dependencies),
    /publish failed; rerun with the original artifact/,
  )
  assert.deepEqual([...f.registry.keys()], order.slice(0, 3))
  assert.deepEqual(f.waits, [1000, 2000, 4000])
  for (const name of f.registry.keys()) f.tags.set(name, { latest: '99.0.0' })
  f.dependencies.run = run
  f.calls.length = 0
  const result = await publishRelease(f.options, f.dependencies)
  assert.deepEqual(
    result.map(({ status }) => status),
    ['existing', 'existing', 'existing', 'published'],
  )
  assert.equal(publishCalls(f).length, 1)
})

test('a lost npm response is recovered by matching registry integrity, without another upload', async (t) => {
  const f = fixture(t)
  const run = f.dependencies.run
  f.dependencies.run = (...args) => {
    const result = run(...args)
    if (args[1][0] === 'publish') throw new Error('response lost after registry accepted upload')
    return result
  }
  assert.equal((await publishRelease(f.options, f.dependencies)).length, 4)
  assert.equal(publishCalls(f).length, 4)
})

test('post-upload visibility is checked before proceeding to dependent packages', async (t) => {
  const f = fixture(t)
  const fetch = f.dependencies.fetch
  let delayed = false
  f.dependencies.fetch = (url, init) => {
    if (f.registry.size === 1 && !delayed) {
      delayed = true
      return Promise.resolve(json({}, 404))
    }
    return fetch(url, init)
  }
  await publishRelease(f.options, f.dependencies)
  assert.deepEqual(f.waits, [1000])
})

test('a successful npm exit without a visible version is a failure, not a completed release', async (t) => {
  const f = fixture(t)
  f.dependencies.run = () => 'fixture-npm\n'
  await assert.rejects(publishRelease(f.options, f.dependencies), /upload not yet visible/)
  assert.equal(f.registry.size, 0)
})

for (const modification of [
  (metadata) => {
    metadata.dist.integrity = 'sha512-different'
  },
  (metadata) => {
    delete metadata.dist.integrity
  },
  (metadata) => {
    metadata.name = '@attacker/different'
  },
  (metadata) => {
    metadata.version = '9.9.9'
  },
]) {
  test(`any existing integrity/identity conflict prevents ALL uploads (${modification})`, async (t) => {
    const f = fixture(t)
    const metadata = f.metadata(f.record.packages[0]) // app is last in publication order
    modification(metadata)
    f.registry.set(
      metadata.name === '@attacker/different' ? '@autonomys/app' : metadata.name,
      metadata,
    )
    await assert.rejects(
      publishRelease(f.options, f.dependencies),
      /Registry integrity\/identity conflict/,
    )
    assert.equal(publishCalls(f).length, 0)
  })
}

for (const status of [301, 401, 403, 429, 500, 503]) {
  test(`HTTP ${status} is not treated as a missing version`, async (t) => {
    const f = fixture(t)
    f.dependencies.fetch = async () => json({}, status)
    await assert.rejects(publishRelease(f.options, f.dependencies), /Registry read failed/)
    assert.equal(publishCalls(f).length, 0)
  })
}

for (const value of [null, [], 'invalid', {}, { dist: {} }]) {
  test(`invalid registry metadata fails closed: ${JSON.stringify(value)}`, async (t) => {
    const f = fixture(t)
    f.dependencies.fetch = async () => json(value)
    await assert.rejects(
      publishRelease(f.options, f.dependencies),
      /Invalid registry JSON|Registry integrity\/identity conflict/,
    )
    assert.equal(publishCalls(f).length, 0)
  })
}

test('network failures and malformed JSON fail before publishing', async (t) => {
  const f = fixture(t)
  for (const fetch of [
    async () => {
      throw new Error('network failure')
    },
    async () => new Response('{invalid'),
  ]) {
    f.dependencies.fetch = fetch
    await assert.rejects(publishRelease(f.options, f.dependencies))
  }
  assert.equal(publishCalls(f).length, 0)
})

test('a concurrent matching upload is skipped when rechecked; a conflicting one stops', async (t) => {
  for (const conflict of [false, true]) {
    const f = fixture(t)
    const fetch = f.dependencies.fetch
    let baseReads = 0
    f.dependencies.fetch = (url, init) => {
      if (decodeURIComponent(url.pathname) === '/@autonomys/base/1.2.3' && ++baseReads === 2) {
        const pkg = f.record.packages.find((pkg) => pkg.name === '@autonomys/base')
        const metadata = f.metadata(pkg)
        if (conflict) metadata.dist.integrity = 'different'
        f.registry.set(pkg.name, metadata)
      }
      return fetch(url, init)
    }
    if (conflict) {
      await assert.rejects(publishRelease(f.options, f.dependencies), /conflict/)
      assert.equal(publishCalls(f).length, 0)
    } else {
      const result = await publishRelease(f.options, f.dependencies)
      assert.equal(result[0].status, 'existing')
      assert.equal(publishCalls(f).length, 3)
    }
  }
})

test('post-upload integrity conflicts stop before the next package', async (t) => {
  const f = fixture(t)
  const run = f.dependencies.run
  f.dependencies.run = (...args) => {
    const result = run(...args)
    if (args[1][0] === 'publish') f.registry.get('@autonomys/base').dist.integrity = 'different'
    return result
  }
  await assert.rejects(publishRelease(f.options, f.dependencies), /conflict/)
  assert.equal(publishCalls(f).length, 1)
})

test('new publishes cannot move latest or beta backwards, including numerical beta counters', async (t) => {
  for (const [version, current] of [
    ['1.2.3', '1.2.4'],
    ['1.2.3', '2.0.0'],
    ['1.2.4-beta.9', '1.2.4-beta.10'],
    ['1.2.4-beta.9', '1.2.4'],
    ['1.2.4-beta.9', '2.0.0-beta.0'],
  ]) {
    const f = fixture(t, version)
    f.tags.set('@autonomys/app', { [f.options.tag]: current })
    await assert.rejects(publishRelease(f.options, f.dependencies), /backwards/)
    assert.equal(publishCalls(f).length, 0)
  }
})

test('beta publication uses beta explicitly and accepts an earlier numeric counter', async (t) => {
  const f = fixture(t, '1.2.4-beta.10')
  f.tags.set('@autonomys/app', { beta: '1.2.4-beta.9' })
  await publishRelease(f.options, f.dependencies)
  assert.ok(publishCalls(f).every(({ args }) => args.includes('--tag=beta')))
})

for (const status of [401, 404, 403, 429, 500]) {
  test(`dist-tags HTTP ${status} stops all uploads with package/channel context`, async (t) => {
    const f = fixture(t)
    const fetch = f.dependencies.fetch
    f.dependencies.fetch = (url, init) =>
      url.pathname.startsWith('/-/package/') ? Promise.resolve(json({}, status)) : fetch(url, init)
    await assert.rejects(publishRelease(f.options, f.dependencies), (error) => {
      assert.match(error.message, /@autonomys\/base:/)
      if (status === 401 || status === 404)
        assert.match(error.message, /initial manual publish and trusted-publisher setup/)
      else {
        assert.match(error.message, /cannot read latest dist-tag/)
        assert.doesNotMatch(error.message, /initial manual publish/)
      }
      return true
    })
    assert.equal(publishCalls(f).length, 0)
  })
}

for (const [version, current] of [
  ['1.2.3', '1.2.2-hotfix.1'],
  ['1.2.3-beta.2', '1.2.3-rc.1'],
  ['1.2.3', null],
]) {
  test(`unsupported existing dist-tag has package/channel/value context: ${current}`, async (t) => {
    const f = fixture(t, version)
    f.tags.set('@autonomys/app', { [f.options.tag]: current })
    await assert.rejects(publishRelease(f.options, f.dependencies), {
      message: `@autonomys/app: unsupported existing ${f.options.tag} dist-tag ${JSON.stringify(current)}`,
    })
    assert.equal(publishCalls(f).length, 0)
  })
}

for (const publishConfig of [
  { '@autonomys:registry': 'http://127.0.0.1:9/' },
  { 'https-proxy': 'http://127.0.0.1:9/', 'strict-ssl': false },
  { access: 'public' },
  {},
  null,
]) {
  test(`authenticated tarballs cannot carry publishConfig: ${JSON.stringify(publishConfig)}`, async (t) => {
    const f = fixture(t)
    const staging = path.join(f.root, 'packing/app')
    write(path.join(staging, 'package/package.json'), { ...f.source[0], publishConfig })
    const bytes = pack(staging)
    const pkg = f.record.packages[0] // invalid package is last in publication order
    fs.writeFileSync(path.join(f.input, pkg.tarball), bytes)
    pkg.integrity = `sha512-${digest(bytes, 'sha512', 'base64')}`
    f.options.manifestSha256 = f.saveManifest() // authenticated assembly regression
    for (const publish of [false, true]) {
      await assert.rejects(
        publishRelease({ ...f.options, publish }, f.dependencies),
        /@autonomys\/app:.*publishConfig is forbidden/,
      )
    }
    assert.equal(f.calls.length, 0)
    assert.equal(f.reads.length, 0)
  })
}

for (const kind of [
  'wrong name',
  'wrong version',
  'malformed JSON',
  'duplicate manifest',
  'alias manifest',
  'missing manifest',
  'symlink manifest',
  'hardlink manifest',
  'invalid archive',
]) {
  test(`rejects authenticated ${kind} before npm or registry access`, async (t) => {
    const f = fixture(t)
    const staging = path.join(f.root, 'packing/app')
    const manifest = path.join(staging, 'package/package.json')
    let entries = ['package/package.json']
    if (kind === 'wrong name') write(manifest, { ...f.source[0], name: '@attacker/app' })
    if (kind === 'wrong version') write(manifest, { ...f.source[0], version: '9.9.9' })
    if (kind === 'malformed JSON') write(manifest, '{invalid')
    if (kind === 'duplicate manifest') entries.push('package/package.json')
    if (kind === 'alias manifest') {
      write(path.join(staging, 'other/package.json'), {
        ...f.source[0],
        publishConfig: { 'strict-ssl': false },
      })
      entries.push('other/package.json')
    }
    if (kind === 'missing manifest') {
      write(path.join(staging, 'package/README'), 'fixture')
      entries = ['package/README']
    }
    if (kind === 'symlink manifest' || kind === 'hardlink manifest') {
      const target = path.join(staging, 'package/target.json')
      fs.renameSync(manifest, target)
      if (kind === 'symlink manifest') fs.symlinkSync('target.json', manifest)
      else fs.linkSync(target, manifest)
      entries.unshift('package/target.json')
    }
    const bytes = kind === 'invalid archive' ? Buffer.from('not a tarball') : pack(staging, entries)
    const pkg = f.record.packages[0]
    fs.writeFileSync(path.join(f.input, pkg.tarball), bytes)
    pkg.integrity = `sha512-${digest(bytes, 'sha512', 'base64')}`
    f.options.manifestSha256 = f.saveManifest()
    await assert.rejects(
      publishRelease(f.options, f.dependencies),
      /@autonomys\/app: invalid packaged manifest/,
    )
    assert.equal(f.calls.length, 0)
    assert.equal(f.reads.length, 0)
  })
}

for (const [version, tag] of [
  ['1.2.3', 'beta'],
  ['1.2.3-beta.0', 'latest'],
  ['1.2.3-rc.0', 'beta'],
  ['01.2.3', 'latest'],
  ['1.2.3+build', 'latest'],
  ['1.2.3', 'next'],
]) {
  test(`rejects unsupported channel/version ${version} -> ${tag}`, async (t) => {
    const f = fixture(t, version)
    f.options.tag = tag
    await assert.rejects(
      publishRelease(f.options, f.dependencies),
      /channel|Unsupported release version/,
    )
    assert.equal(f.calls.length, 0)
    assert.equal(f.reads.length, 0)
  })
}

test('the independently supplied assembly digest detects a replaced manifest and tarball', async (t) => {
  const f = fixture(t)
  const pkg = f.record.packages[0]
  write(path.join(f.input, pkg.tarball), 'replacement tarball')
  pkg.integrity = `sha512-${digest('replacement tarball', 'sha512', 'base64')}`
  f.saveManifest() // attacker cannot replace options.manifestSha256 from the trusted job
  await assert.rejects(publishRelease(f.options, f.dependencies), /manifest digest mismatch/)
  assert.equal(f.calls.length, 0)
  assert.equal(f.reads.length, 0)
})

for (const [name, change, error] of [
  ['missing package', (f) => f.record.packages.pop(), /Incomplete assembly manifest/],
  [
    'duplicate package',
    (f) => {
      f.record.packages[1] = f.record.packages[0]
    },
    /identity mismatch/,
  ],
  [
    'unknown name',
    (f) => {
      f.record.packages[0].name = '@attacker/app'
    },
    /identity mismatch/,
  ],
  [
    'wrong version',
    (f) => {
      f.record.packages[0].version = '9.9.9'
    },
    /identity mismatch/,
  ],
  [
    'traversal',
    (f) => {
      f.record.packages[0].tarball = '../outside.tgz'
    },
    /identity mismatch/,
  ],
  [
    'wrong schema',
    (f) => {
      f.record.schemaVersion = 2
    },
    /Invalid assembly manifest/,
  ],
  [
    'wrong source',
    (f) => {
      f.record.sourceCommit = 'a'.repeat(40)
    },
    /source commit/,
  ],
]) {
  test(`validates the full assembly record against committed source: ${name}`, async (t) => {
    const f = fixture(t)
    change(f)
    f.options.manifestSha256 = f.saveManifest()
    await assert.rejects(publishRelease(f.options, f.dependencies), error)
    assert.equal(f.calls.length, 0)
    assert.equal(f.reads.length, 0)
  })
}

test('missing independent identities, wrong checkout, and mismatched toolchains fail closed', async (t) => {
  for (const override of [
    { sourceCommit: undefined },
    { manifestSha256: undefined },
    { sourceCommit: 'f'.repeat(40) },
  ]) {
    const f = fixture(t)
    await assert.rejects(publishRelease({ ...f.options, ...override }, f.dependencies))
    assert.equal(f.calls.length, 0)
  }
  for (const override of [{ nodeVersion: 'v0.0.0' }, { npmVersion: '0.0.0' }]) {
    const f = fixture(t)
    Object.assign(f.record, override)
    f.options.manifestSha256 = f.saveManifest()
    await assert.rejects(publishRelease(f.options, f.dependencies), /same pinned Node and npm/)
    assert.equal(f.reads.length, 0)
    assert.equal(publishCalls(f).length, 0)
  }
})

for (const kind of ['modified', 'missing', 'symlink', 'hardlink', 'directory', 'extra config']) {
  test(`rejects ${kind} artifact content before invoking npm or the registry`, async (t) => {
    const f = fixture(t)
    const file = path.join(f.input, f.record.packages.at(-1).tarball)
    if (kind === 'modified') write(file, 'modified')
    if (kind === 'missing') fs.unlinkSync(file)
    if (kind === 'symlink' || kind === 'hardlink') {
      const outside = path.join(f.root, 'outside.tgz')
      fs.renameSync(file, outside)
      fs[kind === 'symlink' ? 'symlinkSync' : 'linkSync'](outside, file)
    }
    if (kind === 'directory') {
      fs.unlinkSync(file)
      fs.mkdirSync(file)
    }
    if (kind === 'extra config')
      write(path.join(f.input, '.npmrc'), 'registry=https://example.invalid')
    await assert.rejects(publishRelease(f.options, f.dependencies))
    assert.equal(f.calls.length, 0)
    assert.equal(f.reads.length, 0)
  })
}

test('rejects symlinked artifact roots and manifests', async (t) => {
  const f = fixture(t)
  const link = path.join(f.root, 'linked-artifact')
  fs.symlinkSync(f.input, link)
  await assert.rejects(
    publishRelease({ ...f.options, input: link }, f.dependencies),
    /real directory/,
  )
  const outside = path.join(f.root, 'manifest.json')
  fs.renameSync(path.join(f.input, 'manifest.json'), outside)
  fs.symlinkSync(outside, path.join(f.input, 'manifest.json'))
  await assert.rejects(publishRelease(f.options, f.dependencies), /regular, unlinked file/)
})

test('npm reads a private verified snapshot even if the original download changes', async (t) => {
  const f = fixture(t)
  const fetch = f.dependencies.fetch
  f.dependencies.fetch = (...args) => {
    for (const pkg of f.record.packages)
      write(path.join(f.input, pkg.tarball), 'changed after validation')
    return fetch(...args)
  }
  await publishRelease(f.options, f.dependencies) // fake npm checks every snapshot's original hash
  assert.equal(publishCalls(f).length, 4)
})

test('package policy is read from the reviewed commit, not working-tree edits', async (t) => {
  const f = fixture(t)
  write(path.join(f.repo, 'packages/app/package.json'), {
    name: '@attacker/app',
    version: '99.0.0',
  })
  write(path.join(f.repo, 'scripts/release/package-layout.json'), { packageDirectories: [] })
  assert.equal((await publishRelease(f.options, f.dependencies)).length, 4)
})

test('internal dependency cycles fail before any registry requests', async (t) => {
  const f = fixture(t)
  f.source[1].dependencies = { '@autonomys/app': '^1.2.3' }
  write(path.join(f.repo, 'packages/base/package.json'), f.source[1])
  f.record.sourceCommit = f.options.sourceCommit = f.commit()
  f.options.manifestSha256 = f.saveManifest()
  await assert.rejects(publishRelease(f.options, f.dependencies), /dependency cycle/)
  assert.equal(f.calls.length, 0)
  assert.equal(f.reads.length, 0)
})

test('publishing refuses local, PR, fork, mismatched-source, and incomplete OIDC contexts', async (t) => {
  const f = fixture(t)
  for (const override of [
    { GITHUB_ACTIONS: undefined },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REPOSITORY: 'fork/auto-sdk' },
    { GITHUB_REF: 'refs/heads/feature' },
    { GITHUB_SHA: 'a'.repeat(40) },
    { GITHUB_WORKFLOW_SHA: 'a'.repeat(40) },
    { GITHUB_WORKFLOW_REF: 'autonomys/auto-sdk/.github/workflows/other.yaml@refs/heads/main' },
    { RUNNER_ENVIRONMENT: 'self-hosted' },
    { ACTIONS_ID_TOKEN_REQUEST_TOKEN: undefined },
    { GITHUB_RUN_ID: undefined },
  ]) {
    await assert.rejects(
      publishRelease(f.options, { ...f.dependencies, env: { ...f.dependencies.env, ...override } }),
      /Publishing requires|Missing GitHub publishing context/,
    )
  }
  assert.equal(f.calls.length, 0)
  assert.equal(f.reads.length, 0)
})

test('assembly CLI emits independent identity outputs that authenticate real npm tarballs', async (t) => {
  const f = fixture(t)
  const compiled = path.join(f.root, 'compiled')
  const packed = path.join(f.root, 'packed')
  for (const name of names)
    write(path.join(compiled, name, 'dist/index.js'), 'module.exports = 42\n')
  const assemblyScript = path.join(f.repo, 'scripts/release/assemble.js')
  fs.copyFileSync(path.join(__dirname, 'assemble.js'), assemblyScript)
  const outputFile = path.join(f.root, 'github-output')
  execFileSync(process.execPath, [assemblyScript, compiled, packed], {
    cwd: f.repo,
    env: { ...process.env, GITHUB_OUTPUT: outputFile },
    stdio: 'pipe',
  })
  const outputs = Object.fromEntries(
    fs
      .readFileSync(outputFile, 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split('=')),
  )
  assert.equal(outputs['source-commit'], f.options.sourceCommit)
  assert.equal(
    outputs['manifest-sha256'],
    digest(fs.readFileSync(path.join(packed, 'manifest.json'))),
  )
  f.dependencies.fetch = f.dependencies.run = () =>
    assert.fail('offline verification must not execute npm or fetch')
  const result = await publishRelease(
    {
      ...f.options,
      input: packed,
      publish: false,
      sourceCommit: outputs['source-commit'],
      manifestSha256: outputs['manifest-sha256'],
    },
    f.dependencies,
  )
  assert.deepEqual(
    result.map(({ name }) => name),
    order,
  )
})
