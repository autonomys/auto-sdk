import {
  createPaymentIntent,
  createUsdcPaymentIntent,
  getPaymentIntentStatus,
  getUsdcPaymentTarget,
  waitForPaymentCompletion,
  watchPaymentTransaction,
} from '../src/api/calls/payment'
import { PaymentApiError, usdcReceiverAbi, erc20ApprovalAbi } from '../src/api/models/payment'
import { AutoDriveApiHandler } from '../src/api/types'
import { createApiInterface } from '../src/api/wrappers'

type Route = (init: Partial<Request>, body?: BodyInit) => Response | Promise<Response>

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const createMockApi = (routes: Record<string, Route>) => {
  const sendAPIRequest = jest.fn(
    async (url: string, init: Partial<Request>, body?: BodyInit): Promise<Response> => {
      const route = routes[`${init.method} ${url}`]
      if (!route) {
        throw new Error(`Unexpected request: ${init.method} ${url}`)
      }
      return route(init, body)
    },
  )
  const api: AutoDriveApiHandler = {
    sendAPIRequest,
    sendDownloadRequest: jest.fn(),
    baseUrl: 'https://example.invalid/api',
    downloadBaseUrl: 'https://example.invalid/downloads',
  }
  return { api, sendAPIRequest }
}

const TARGET = {
  chainId: 11155111,
  receiverAddress: '0x00000000000000000000000000000000000000aa',
  tokenAddress: '0x00000000000000000000000000000000000000bb',
  tokenDecimals: 6,
  confirmations: 6,
  settleGraceMs: 120_000,
}

const INTENT_ID = '0x' + 'ab'.repeat(32)

const USDC_INTENT = {
  id: INTENT_ID,
  userPublicId: 'user-1',
  status: 'pending',
  paymentMethod: 'usdc_eth',
  shannonsPerByte: '1000000',
  expiresAt: '2026-10-07T12:10:00.000Z',
  quotedTokenAmount: '2500001',
  quotedAi3Shannons: '1073741824000000',
  usdRateAtCreation: '6400000000000000',
}

const usdcRoutes = (intentRoute: Route = () => json(200, USDC_INTENT)) => ({
  'GET /payments/usdc/target': () => json(200, TARGET),
  'POST /intents': intentRoute,
})

describe('getUsdcPaymentTarget', () => {
  it('maps the target response', async () => {
    const { api, sendAPIRequest } = createMockApi({
      'GET /payments/usdc/target': () => json(200, { ...TARGET, unexpectedField: 'ignored' }),
    })

    await expect(getUsdcPaymentTarget(api)).resolves.toEqual(TARGET)
    expect(sendAPIRequest).toHaveBeenCalledWith('/payments/usdc/target', { method: 'GET' })
  })

  it('throws a coded PaymentApiError when USDC is disabled', async () => {
    const { api } = createMockApi({
      'GET /payments/usdc/target': () =>
        json(403, { error: 'USDC_PAYMENTS_DISABLED', message: 'Pay in AI3 instead.' }),
    })

    const error = await getUsdcPaymentTarget(api).catch((e) => e)
    expect(error).toBeInstanceOf(PaymentApiError)
    expect(error).toMatchObject({
      status: 403,
      code: 'USDC_PAYMENTS_DISABLED',
      message: 'Failed to fetch USDC payment target: 403 Pay in AI3 instead.',
    })
  })
})

describe('createUsdcPaymentIntent', () => {
  it('sends paymentMethod and requestedBytes and returns the quote', async () => {
    const { api, sendAPIRequest } = createMockApi(usdcRoutes())

    const intent = await createUsdcPaymentIntent(api, 1_073_741_824)

    const call = sendAPIRequest.mock.calls.find(([url]) => url === '/intents')!
    const [, init, body] = call
    expect(init.method).toBe('POST')
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(body as string)).toEqual({
      paymentMethod: 'usdc_eth',
      requestedBytes: '1073741824',
    })

    expect(intent).toEqual({
      intentId: INTENT_ID,
      paymentMethod: 'usdc_eth',
      usdcAmount: '2500001',
      usdcAmountFormatted: '2.500001',
      receiverAddress: TARGET.receiverAddress,
      tokenAddress: TARGET.tokenAddress,
      chainId: TARGET.chainId,
      tokenDecimals: 6,
      confirmations: 6,
      settleGraceMs: 120_000,
      expiresAt: USDC_INTENT.expiresAt,
      shannonsPerByte: '1000000',
      quotedAi3Shannons: '1073741824000000',
      usdRateAtCreation: '6400000000000000',
    })
  })

  it('sends a bigint size above 2^53 exactly', async () => {
    const { api, sendAPIRequest } = createMockApi(usdcRoutes())

    await createUsdcPaymentIntent(api, BigInt('9007199254740993'))

    const [, , body] = sendAPIRequest.mock.calls.find(([url]) => url === '/intents')!
    expect(JSON.parse(body as string).requestedBytes).toBe('9007199254740993')
  })

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, BigInt(0), BigInt(-1)])(
    'rejects invalid size %p without calling the API',
    async (size) => {
      const { api, sendAPIRequest } = createMockApi(usdcRoutes())

      await expect(createUsdcPaymentIntent(api, size)).rejects.toThrow(TypeError)
      expect(sendAPIRequest).not.toHaveBeenCalled()
    },
  )

  it.each([
    [403, 'GOOGLE_ACCOUNT_REQUIRED'],
    [403, 'CREDIT_CAP_EXCEEDED'],
    [403, 'USDC_PAYMENTS_DISABLED'],
    [503, 'USDC_PAYMENTS_UNAVAILABLE'],
    [503, 'PRICE_ORACLE_UNAVAILABLE'],
    [503, 'PRICE_UNSTABLE'],
  ])('surfaces %i %s as PaymentApiError.code', async (status, code) => {
    const { api } = createMockApi(
      usdcRoutes(() => json(status, { error: code, message: `Refused: ${code}` })),
    )

    const error = await createUsdcPaymentIntent(api, 1024).catch((e) => e)
    expect(error).toBeInstanceOf(PaymentApiError)
    expect(error).toMatchObject({
      name: 'PaymentApiError',
      status,
      code,
      message: `Failed to create USDC payment intent: ${status} Refused: ${code}`,
    })
  })

  it('surfaces uncoded and non-JSON error bodies without a code', async () => {
    const uncoded = createMockApi(
      usdcRoutes(() => json(400, { error: 'Invalid requestedBytes: expected a whole number' })),
    )
    const uncodedError = await createUsdcPaymentIntent(uncoded.api, 1024).catch((e) => e)
    expect(uncodedError).toBeInstanceOf(PaymentApiError)
    expect(uncodedError.code).toBeUndefined()
    expect(uncodedError.message).toBe(
      'Failed to create USDC payment intent: 400 Invalid requestedBytes: expected a whole number',
    )

    const plain = createMockApi(usdcRoutes(() => new Response('Bad Gateway', { status: 502 })))
    const plainError = await createUsdcPaymentIntent(plain.api, 1024).catch((e) => e)
    expect(plainError).toMatchObject({
      status: 502,
      code: undefined,
      message: 'Failed to create USDC payment intent: 502 Bad Gateway',
    })
  })

  it('throws when the backend returns no USDC quote', async () => {
    const { api } = createMockApi(
      usdcRoutes(() => json(200, { ...USDC_INTENT, quotedTokenAmount: undefined })),
    )

    await expect(createUsdcPaymentIntent(api, 1024)).rejects.toThrow(/no USDC quote/)
  })
})

describe('createPaymentIntent (AI3)', () => {
  const ai3Routes = (intentRoute: Route) => ({
    'GET /intents/contract': () =>
      json(200, { chainId: 870, contractAddress: '0xcc', payIntentAbi: [] }),
    'POST /intents': intentRoute,
  })
  const AI3_INTENT = { id: INTENT_ID, shannonsPerByte: '1000', expiresAt: 'x' }

  it('sends no body by default', async () => {
    const { api, sendAPIRequest } = createMockApi(ai3Routes(() => json(200, AI3_INTENT)))

    const intent = await createPaymentIntent(api, 1024)

    expect(sendAPIRequest).toHaveBeenCalledWith('/intents', { method: 'POST' }, undefined)
    expect(intent.ai3AmountWei).toBe('1024000')
  })

  it('sends requestedBytes when checkCreditCap is set and surfaces CREDIT_CAP_EXCEEDED', async () => {
    const { api, sendAPIRequest } = createMockApi(
      ai3Routes(() => json(403, { error: 'CREDIT_CAP_EXCEEDED', message: 'Over the cap' })),
    )

    const error = await createPaymentIntent(api, 1024, { checkCreditCap: true }).catch((e) => e)

    const [, , body] = sendAPIRequest.mock.calls.find(([url]) => url === '/intents')!
    expect(JSON.parse(body as string)).toEqual({ requestedBytes: '1024' })
    expect(error).toBeInstanceOf(PaymentApiError)
    expect(error).toMatchObject({ status: 403, code: 'CREDIT_CAP_EXCEEDED' })
  })
})

describe('watchPaymentTransaction / getPaymentIntentStatus', () => {
  it('posts the tx hash to the shared watch endpoint', async () => {
    const txHash = '0x' + 'cd'.repeat(32)
    const { api, sendAPIRequest } = createMockApi({
      [`POST /intents/${INTENT_ID}/watch`]: () => new Response(null, { status: 204 }),
    })

    await watchPaymentTransaction(api, INTENT_ID, txHash)

    const [, , body] = sendAPIRequest.mock.calls[0]
    expect(JSON.parse(body as string)).toEqual({ txHash })
  })

  it('throws a PaymentApiError carrying status 410 once the lock lapses', async () => {
    const { api } = createMockApi({
      [`GET /intents/${INTENT_ID}`]: () => json(410, { error: 'Intent has expired' }),
    })

    await expect(getPaymentIntentStatus(api, INTENT_ID)).rejects.toMatchObject({
      status: 410,
      message: 'Failed to get payment intent status: 410 Intent has expired',
    })
  })
})

describe('waitForPaymentCompletion', () => {
  const POLL_MS = 3_000
  const GRACE_MS = 10_000

  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  // Serves the given responses in order, repeating the last one.
  const statusSequence = (...responses: Array<() => Response>) => {
    let index = 0
    return createMockApi({
      [`GET /intents/${INTENT_ID}`]: () => responses[Math.min(index++, responses.length - 1)](),
    })
  }
  const ok = (status: string) => () => json(200, { id: INTENT_ID, status })
  const gone = () => json(410, { error: 'Intent has expired' })

  const run = async <T>(promise: Promise<T>) => {
    const settled = promise.then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    await jest.runAllTimersAsync()
    return settled
  }

  it('polls through 410 until the intent completes', async () => {
    const { api, sendAPIRequest } = statusSequence(
      ok('pending'),
      gone,
      gone,
      ok('confirmed'),
      ok('completed'),
    )

    const result = await run(
      waitForPaymentCompletion(api, INTENT_ID, {
        pollIntervalMs: POLL_MS,
        settleGraceMs: GRACE_MS,
      }),
    )

    expect(result).toEqual({ value: 'COMPLETED' })
    expect(sendAPIRequest).toHaveBeenCalledTimes(5)
  })

  it('returns EXPIRED once 410 has persisted for settleGraceMs', async () => {
    const { api, sendAPIRequest } = statusSequence(gone)
    const start = Date.now()

    const result = await run(
      waitForPaymentCompletion(api, INTENT_ID, {
        pollIntervalMs: POLL_MS,
        settleGraceMs: GRACE_MS,
      }),
    )

    expect(result).toEqual({ value: 'EXPIRED' })
    // 410 first seen at t=0; polls at 3s, 6s and 9s are inside the grace; 12s is past it.
    expect(sendAPIRequest).toHaveBeenCalledTimes(5)
    expect(Date.now() - start).toBe(12_000)
  })

  it('restarts the grace after a successful read', async () => {
    // 410 at 0s and 3s, OK at 6s, then 410 from 9s. Without the reset the
    // grace would run out at 12s; with it, it runs out at 21s (9s + 12s).
    const { api, sendAPIRequest } = statusSequence(gone, gone, ok('pending'), gone)

    const result = await run(
      waitForPaymentCompletion(api, INTENT_ID, {
        pollIntervalMs: POLL_MS,
        settleGraceMs: GRACE_MS,
      }),
    )

    expect(result).toEqual({ value: 'EXPIRED' })
    expect(sendAPIRequest).toHaveBeenCalledTimes(8)
  })

  it('treats the first 410 as terminal when settleGraceMs is 0', async () => {
    const { api, sendAPIRequest } = statusSequence(gone)

    const result = await run(waitForPaymentCompletion(api, INTENT_ID, { settleGraceMs: 0 }))

    expect(result).toEqual({ value: 'EXPIRED' })
    expect(sendAPIRequest).toHaveBeenCalledTimes(1)
  })

  it('still throws on 410 when settleGraceMs is not set', async () => {
    const { api } = statusSequence(ok('pending'), gone)

    const result = await run(waitForPaymentCompletion(api, INTENT_ID, { pollIntervalMs: POLL_MS }))

    expect(result).toEqual({ error: expect.any(PaymentApiError) })
    expect((result as { error: PaymentApiError }).error.status).toBe(410)
  })

  it('does not swallow other errors during the grace', async () => {
    const { api } = statusSequence(gone, () => json(500, { error: 'boom' }))

    const result = await run(
      waitForPaymentCompletion(api, INTENT_ID, {
        pollIntervalMs: POLL_MS,
        settleGraceMs: GRACE_MS,
      }),
    )

    expect((result as { error: PaymentApiError }).error).toMatchObject({ status: 500 })
  })

  it('still times out if the grace outlasts timeoutMs', async () => {
    const { api } = statusSequence(gone)

    const result = await run(
      waitForPaymentCompletion(api, INTENT_ID, {
        pollIntervalMs: POLL_MS,
        timeoutMs: 5_000,
        settleGraceMs: GRACE_MS,
      }),
    )

    expect((result as { error: Error }).error.message).toMatch(/Timed out/)
  })
})

describe('AutoDriveApi wiring and ABIs', () => {
  it('binds the USDC calls onto the API object', async () => {
    const { api } = createMockApi(usdcRoutes())
    const autoDrive = createApiInterface(api)

    await expect(autoDrive.getUsdcPaymentTarget()).resolves.toEqual(TARGET)
    await expect(autoDrive.createUsdcPaymentIntent(BigInt(1024))).resolves.toMatchObject({
      intentId: INTENT_ID,
      usdcAmount: '2500001',
    })
  })

  it('exports only the functions the USDC flow needs', () => {
    expect(usdcReceiverAbi.map((f) => f.name)).toEqual(['payIntentWithToken'])
    expect(erc20ApprovalAbi.map((f) => f.name)).toEqual(['approve', 'allowance', 'balanceOf'])
  })
})
