import { build } from 'esbuild'
import path from 'path'
import { createContext, runInContext } from 'vm'

// Bundles the package the way a browser app does, with no Node polyfills, and
// runs it in a context that has browser globals only (no Buffer, no process).
// Reads the built dist via the "browser" export, so it needs `yarn build` first.

const browserGlobals = [
  'AbortController',
  'AbortSignal',
  'Blob',
  'DOMException',
  'File',
  'FormData',
  'Headers',
  'ReadableStream',
  'Request',
  'Response',
  'TextDecoder',
  'TextEncoder',
  'TransformStream',
  'URL',
  'URLSearchParams',
  'WebAssembly',
  'WritableStream',
  'atob',
  'btoa',
  'clearInterval',
  'clearTimeout',
  'console',
  'crypto',
  'queueMicrotask',
  'setInterval',
  'setTimeout',
  'structuredClone',
] as const

const loadBrowserBundle = async () => {
  const result = await build({
    stdin: {
      contents:
        "import * as autoDrive from '@autonomys/auto-drive'\nglobalThis.autoDrive = autoDrive",
      resolveDir: path.resolve(__dirname, '..'),
    },
    bundle: true,
    platform: 'browser',
    format: 'iife',
    write: false,
    logLevel: 'silent',
  })

  const fetchCalls: { url: string; init: RequestInit }[] = []
  const context: Record<string, unknown> = Object.fromEntries(
    browserGlobals.map((name) => [name, globalThis[name]]),
  )
  context.fetch = async (url: string, init: RequestInit) => {
    fetchCalls.push({ url, init })
    if (url.endsWith('/uploads/file')) return Response.json({ id: 'upload-1' })
    if (url.endsWith('/uploads/upload-1/complete')) return Response.json({ cid: 'uploaded-cid' })
    return new Response(null, { status: 200 })
  }
  context.globalThis = context
  context.window = context
  context.self = context

  createContext(context)
  runInContext(result.outputFiles[0].text, context)

  return { autoDrive: context.autoDrive as typeof import('../src/browser'), fetchCalls }
}

describe('browser bundle', () => {
  let bundle: Awaited<ReturnType<typeof loadBrowserBundle>>

  beforeAll(async () => {
    bundle = await loadBrowserBundle()
  }, 60_000)

  const helloWorld = () => new File([new TextEncoder().encode('hello world')], 'a.txt')

  it('computes the same CID as the Node build', async () => {
    await expect(bundle.autoDrive.precomputeCid(helloWorld())).resolves.toBe(
      'bafkr6ihzdhpxxxgeprlwsvfbcdu7big232ikdodi5ycfwo6hawpce5gtci',
    )
  })

  it('uploads a File with compression and encryption', async () => {
    const api = bundle.autoDrive.createAutoDriveApi({
      apiKey: 'test',
      apiUrl: 'https://auto-drive.test/api',
    })

    await expect(api.uploadFileFromInput(helloWorld(), { password: 'secret' })).resolves.toBe(
      'uploaded-cid',
    )

    const [create, ...rest] = bundle.fetchCalls
    expect(JSON.parse(create.init.body as string)).toMatchObject({
      filename: 'a.txt',
      mimeType: 'text/plain',
      uploadOptions: {
        compression: { algorithm: 'ZLIB' },
        encryption: { algorithm: 'AES_256_GCM' },
      },
    })
    expect(rest.map(({ url }) => url.replace(/^.*\/uploads/, '/uploads'))).toEqual([
      '/uploads/file/upload-1/chunk',
      '/uploads/upload-1/complete',
    ])
  })
})
