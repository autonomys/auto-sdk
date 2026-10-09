import { createPaymentIntent } from '../src/api/calls/payment'
import { AutoDriveApiHandler } from '../src/api/types'

describe('createPaymentIntent', () => {
  const mockContract = {
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    chainId: 490000,
    abi: [],
  }

  const mockIntent = {
    id: 'test-intent-id',
    shannonsPerByte: '1000',
    expiresAt: '2026-10-02T16:00:00Z',
  }

  it('rejects non-integer or non-positive sizeBytes', async () => {
    const api = {} as AutoDriveApiHandler

    await expect(createPaymentIntent(api, -1)).rejects.toThrow(
      'sizeBytes must be a positive safe integer, received: -1',
    )
    await expect(createPaymentIntent(api, 0)).rejects.toThrow(
      'sizeBytes must be a positive safe integer, received: 0',
    )
    await expect(createPaymentIntent(api, 1.5)).rejects.toThrow(
      'sizeBytes must be a positive safe integer, received: 1.5',
    )
  })

  it('sends requestedBytes in request body to /intents', async () => {
    const sendAPIRequest = jest.fn().mockImplementation((path: string) => {
      if (path === '/intents/contract') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContract),
        })
      }
      if (path === '/intents') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockIntent),
        })
      }
      throw new Error(`Unexpected path: ${path}`)
    })

    const api = { sendAPIRequest } as unknown as AutoDriveApiHandler
    const result = await createPaymentIntent(api, 1024)

    expect(sendAPIRequest).toHaveBeenCalledWith(
      '/intents',
      expect.objectContaining({
        method: 'POST',
      }),
      JSON.stringify({ requestedBytes: '1024' }),
    )

    expect(result.intentId).toBe('test-intent-id')
    expect(result.ai3AmountWei).toBe((BigInt(1000) * BigInt(1024)).toString())
    expect(result.contractAddress).toBe(mockContract.contractAddress)
  })

  it('propagates status and response body when API responds with error', async () => {
    const errorBody = JSON.stringify({
      error: 'CREDIT_CAP_EXCEEDED',
      message: 'Purchase of 1024 bytes would exceed the per-user credit cap',
    })
    const sendAPIRequest = jest.fn().mockImplementation((path: string) => {
      if (path === '/intents/contract') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContract),
        })
      }
      if (path === '/intents') {
        return Promise.resolve({
          ok: false,
          status: 403,
          text: () => Promise.resolve(errorBody),
        })
      }
      throw new Error(`Unexpected path: ${path}`)
    })

    const api = { sendAPIRequest } as unknown as AutoDriveApiHandler
    await expect(createPaymentIntent(api, 1024)).rejects.toThrow(
      `Failed to create payment intent: 403 ${errorBody}`,
    )
  })
})
