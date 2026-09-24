import { createPaymentIntent, CreditCapExceededError } from '../src/node'
import { AutoDriveApiHandler } from '../src/api/types'

describe('createPaymentIntent', () => {
  const mockContractInfo = {
    chainId: 870,
    contractAddress: '0x1234567890123456789012345678901234567890',
    payIntentAbi: [],
  }

  const createMockApi = (
    intentsResponse: {
      ok: boolean
      status: number
      statusText?: string
      json?: () => Promise<unknown>
      text?: () => Promise<string>
    },
    contractResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => mockContractInfo,
      text: async () => JSON.stringify(mockContractInfo),
    },
  ): AutoDriveApiHandler => {
    return {
      sendAPIRequest: jest
        .fn()
        .mockImplementation(async (url: string, init?: RequestInit, body?: any) => {
          if (url === '/intents/contract') {
            return contractResponse as Response
          }
          if (url === '/intents') {
            return intentsResponse as Response
          }
          throw new Error(`Unexpected URL: ${url}`)
        }),
    } as unknown as AutoDriveApiHandler
  }

  describe('sizeBytes validation', () => {
    it('throws TypeError for non-integer numbers', async () => {
      const mockApi = createMockApi({ ok: true, status: 200 })

      await expect(createPaymentIntent(mockApi, 0.5)).rejects.toThrow(
        new TypeError('sizeBytes must be a positive integer, received: 0.5'),
      )
      await expect(createPaymentIntent(mockApi, 1.23)).rejects.toThrow(TypeError)
    })

    it('throws TypeError for non-positive numbers', async () => {
      const mockApi = createMockApi({ ok: true, status: 200 })

      await expect(createPaymentIntent(mockApi, 0)).rejects.toThrow(
        new TypeError('sizeBytes must be a positive integer, received: 0'),
      )
      await expect(createPaymentIntent(mockApi, -100)).rejects.toThrow(
        new TypeError('sizeBytes must be a positive integer, received: -100'),
      )
    })

    it('throws TypeError for NaN or Infinity', async () => {
      const mockApi = createMockApi({ ok: true, status: 200 })

      await expect(createPaymentIntent(mockApi, NaN)).rejects.toThrow(TypeError)
      await expect(createPaymentIntent(mockApi, Infinity)).rejects.toThrow(TypeError)
    })
  })

  describe('requestedBytes payload and successful intent creation', () => {
    it('sends requestedBytes in POST /intents and returns calculated payment intent', async () => {
      const mockIntentData = {
        id: '0xabcdef1234567890',
        shannonsPerByte: '1000',
        expiresAt: '2026-09-14T12:00:00Z',
      }

      const mockApi = createMockApi({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockIntentData,
        text: async () => JSON.stringify(mockIntentData),
      })

      const sizeBytes = 1024
      const result = await createPaymentIntent(mockApi, sizeBytes)

      expect(mockApi.sendAPIRequest).toHaveBeenCalledWith(
        '/intents',
        expect.objectContaining({
          method: 'POST',
        }),
        JSON.stringify({ requestedBytes: '1024' }),
      )

      expect(result).toEqual({
        intentId: '0xabcdef1234567890',
        ai3AmountWei: (BigInt(1000) * BigInt(1024)).toString(),
        ai3Amount: expect.any(String),
        contractAddress: mockContractInfo.contractAddress,
        shannonsPerByte: '1000',
        expiresAt: '2026-09-14T12:00:00Z',
      })
    })
  })

  describe('error handling and credit cap rejection', () => {
    it('throws CreditCapExceededError when server returns 403 CREDIT_CAP_EXCEEDED', async () => {
      const capErrorMessage =
        'Purchase of 1073741824 bytes would exceed the per-user credit cap of 536870912 bytes'
      const errorPayload = {
        error: 'CREDIT_CAP_EXCEEDED',
        message: capErrorMessage,
      }

      const mockApi = createMockApi({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify(errorPayload),
      })

      await expect(createPaymentIntent(mockApi, 1024)).rejects.toThrow(CreditCapExceededError)
      await expect(createPaymentIntent(mockApi, 1024)).rejects.toThrow(capErrorMessage)
    })

    it('surfaces parsed JSON message on other server error responses', async () => {
      const errorPayload = {
        error: 'INTERNAL_ERROR',
        message: 'Something went wrong processing your request',
      }

      const mockApi = createMockApi({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify(errorPayload),
      })

      await expect(createPaymentIntent(mockApi, 1024)).rejects.toThrow(
        'Failed to create payment intent: 500 Something went wrong processing your request',
      )
    })

    it('surfaces error property directly for uncoded error responses without a message key', async () => {
      const uncodedPayload = {
        error: 'Unauthorized access token',
      }

      const mockApi = createMockApi({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify(uncodedPayload),
      })

      await expect(createPaymentIntent(mockApi, 1024)).rejects.toThrow(
        'Failed to create payment intent: 401 Unauthorized access token',
      )
    })

    it('surfaces raw text error when response body is not valid JSON', async () => {
      const mockApi = createMockApi({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: async () => 'Bad Gateway',
      })

      await expect(createPaymentIntent(mockApi, 1024)).rejects.toThrow(
        'Failed to create payment intent: 502 Bad Gateway',
      )
    })
  })
})
