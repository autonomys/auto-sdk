import { createAsyncDownload } from '../src/api/calls/download'
import { toApiError } from '../src/api/calls/errors'
import { getStoragePrice } from '../src/api/calls/payment'
import { getObject } from '../src/api/calls/read'
import { createFolderUpload } from '../src/api/calls/upload'
import { shareObject } from '../src/api/calls/write'
import { AutoDriveApiHandler } from '../src/api/types'

const json = (status: number, body: unknown, statusText = '') =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  })

const messageOf = async (response: Response) =>
  (await toApiError(response, 'Failed to do thing')).message

describe('toApiError', () => {
  it('uses the JSON message', async () => {
    await expect(messageOf(json(400, { message: 'Bad input' }, 'Bad Request'))).resolves.toBe(
      'Failed to do thing: Bad input',
    )
  })

  it('uses the JSON error when there is no message', async () => {
    await expect(messageOf(json(400, { error: 'Bad input' }, 'Bad Request'))).resolves.toBe(
      'Failed to do thing: Bad input',
    )
  })

  it('prefers the message over the code of a coded error', async () => {
    await expect(
      messageOf(json(403, { error: 'USDC_PAYMENTS_DISABLED', message: 'Pay in AI3 instead.' })),
    ).resolves.toBe('Failed to do thing: Pay in AI3 instead.')
  })

  it('ignores message and error fields that are not strings', async () => {
    await expect(
      messageOf(json(400, { error: { code: 1 }, message: 42 }, 'Bad Request')),
    ).resolves.toBe('Failed to do thing: Bad Request')
  })

  it('falls back to the status text for an HTML body', async () => {
    const html = '<!DOCTYPE html><html><body><pre>Cannot POST /uploads</pre></body></html>'
    const response = new Response(html, {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'text/html' },
    })

    await expect(messageOf(response)).resolves.toBe('Failed to do thing: Not Found')
  })

  it('falls back to the status code when the body and status text are empty', async () => {
    // HTTP/2 responses carry no reason phrase, so statusText is always ''.
    await expect(messageOf(new Response(null, { status: 500 }))).resolves.toBe(
      'Failed to do thing: 500',
    )
  })

  it('falls back to the status text when the body cannot be read', async () => {
    const body = new ReadableStream({
      start: (controller) => controller.error(new Error('connection reset')),
    })
    const response = new Response(body, { status: 400, statusText: 'Bad Request' })

    await expect(messageOf(response)).resolves.toBe('Failed to do thing: Bad Request')
  })

  it('reads the body once', async () => {
    const response = json(400, { error: 'Bad input' })
    const text = jest.spyOn(response, 'text')
    const parseJson = jest.spyOn(response, 'json')

    await messageOf(response)

    expect(text).toHaveBeenCalledTimes(1)
    expect(parseJson).not.toHaveBeenCalled()
    expect(response.bodyUsed).toBe(true)
  })
})

describe('API calls surface the server message', () => {
  const mockApi = (response: Response): AutoDriveApiHandler => ({
    sendAPIRequest: jest.fn(async () => response),
    sendDownloadRequest: jest.fn(async () => response),
    baseUrl: 'https://example.invalid/api',
    downloadBaseUrl: 'https://example.invalid/downloads',
  })

  it('names the entry when a folder upload is rejected for a long name', async () => {
    const name = '文'.repeat(86)
    const error = `Name "${name}" is too long: 258 > 255 bytes`
    const api = mockApi(json(400, { error }))

    await expect(
      createFolderUpload(api, {
        fileTree: { name, type: 'folder', children: [], id: 'root' },
      }),
    ).rejects.toThrow(new Error(`Failed to create folder upload: ${error}`))
  })

  it.each([
    ['getObject', (api: AutoDriveApiHandler) => getObject(api, { cid: 'cid' }), 'get object'],
    [
      'shareObject',
      (api: AutoDriveApiHandler) => shareObject(api, { cid: 'cid', publicId: 'user' }),
      'share object',
    ],
    [
      'createAsyncDownload',
      (api: AutoDriveApiHandler) => createAsyncDownload(api, 'cid'),
      'create async download',
    ],
    ['getStoragePrice', getStoragePrice, 'fetch storage price'],
  ])('%s keeps its prefix', async (_, call, action) => {
    await expect(call(mockApi(json(403, { error: 'Forbidden for you' })))).rejects.toThrow(
      new Error(`Failed to ${action}: Forbidden for you`),
    )
  })
})
