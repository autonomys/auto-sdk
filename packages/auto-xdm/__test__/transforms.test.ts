import { createDomainsChainIdType, type ApiPromise } from '@autonomys/auto-utils'
import {
  chainIdToChain,
  chainToChainIdCodec,
  codecToBalance,
  codecToChannel,
} from '../src/transforms'
import type { ChainId } from '../src/types'

jest.mock('@autonomys/auto-utils', () => ({
  createDomainsChainIdType: jest.fn().mockImplementation((_api, domainId) => ({
    type: 'SpDomainsChainId',
    domainId,
  })),
}))

describe('auto-xdm transforms', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('chainIdToChain', () => {
    it('should convert consensus ChainId to "consensus"', () => {
      const chainId = { consensus: null } as unknown as ChainId
      expect(chainIdToChain(chainId)).toBe('consensus')
    })

    it('should convert domain ChainId to DomainChain', () => {
      const chainId = { domain: 0 } as unknown as ChainId
      expect(chainIdToChain(chainId)).toEqual({ domainId: 0 })
    })

    it('should convert domain 1 ChainId to DomainChain', () => {
      const chainId = { domain: 1 } as unknown as ChainId
      expect(chainIdToChain(chainId)).toEqual({ domainId: 1 })
    })
  })

  describe('chainToChainIdCodec', () => {
    it('should create consensus chain ID codec for "consensus"', () => {
      const mockApi = {} as unknown as ApiPromise

      const result = chainToChainIdCodec(mockApi, 'consensus')
      expect(createDomainsChainIdType).toHaveBeenCalledWith(mockApi)
      expect(result).toBeDefined()
    })

    it('should create domain chain ID codec for domain object', () => {
      const mockApi = {} as unknown as ApiPromise

      const result = chainToChainIdCodec(mockApi, { domainId: 0 })
      expect(createDomainsChainIdType).toHaveBeenCalledWith(mockApi, 0)
      expect(result).toBeDefined()
    })
  })

  describe('codecToBalance', () => {
    it('should handle null and undefined', () => {
      expect(codecToBalance(null)).toBe(0n)
      expect(codecToBalance(undefined)).toBe(0n)
    })

    it('should handle primitive bigint', () => {
      expect(codecToBalance(100n)).toBe(100n)
      expect(codecToBalance(0n)).toBe(0n)
    })

    it('should handle primitive numbers', () => {
      expect(codecToBalance(1000)).toBe(1000n)
      expect(codecToBalance(100.85)).toBe(100n)
      expect(codecToBalance(0)).toBe(0n)
      expect(codecToBalance(NaN)).toBe(0n)
      expect(codecToBalance(Infinity)).toBe(0n)
    })

    it('should handle numeric and hex strings', () => {
      expect(codecToBalance('1000000000000000000')).toBe(1000000000000000000n)
      expect(codecToBalance('  500  ')).toBe(500n)
      expect(codecToBalance('0x10')).toBe(16n)
      expect(codecToBalance('')).toBe(0n)
      expect(codecToBalance('   ')).toBe(0n)
      expect(codecToBalance('non-numeric')).toBe(0n)
    })

    it('should handle Polkadot codec with toBigInt method', () => {
      const mockCodec = {
        toBigInt: () => 5000000000000n,
      }
      expect(codecToBalance(mockCodec)).toBe(5000000000000n)
    })

    it('should handle Codec with toJSON method', () => {
      expect(codecToBalance({ toJSON: () => 42 })).toBe(42n)
      expect(codecToBalance({ toJSON: () => '9999' })).toBe(9999n)
      expect(codecToBalance({ toJSON: () => 12345n })).toBe(12345n)
    })

    it('should handle Codec with custom toString method', () => {
      const mockCodec = {
        toString: () => '888888',
      }
      expect(codecToBalance(mockCodec)).toBe(888888n)
    })

    it('should not throw on plain object without numeric representation', () => {
      expect(codecToBalance({})).toBe(0n)
      expect(codecToBalance({ foo: 'bar' })).toBe(0n)
    })
  })

  describe('codecToChannel', () => {
    it('should return null for non-object or null input', () => {
      expect(codecToChannel(null)).toBeNull()
      expect(codecToChannel(undefined)).toBeNull()
      expect(codecToChannel(123)).toBeNull()
      expect(codecToChannel('string')).toBeNull()
    })

    it('should return null for empty codec or Option None', () => {
      expect(codecToChannel({ isEmpty: true })).toBeNull()
      expect(codecToChannel({ isNone: true })).toBeNull()
    })

    it('should parse Rust snake_case JSON format into Channel', () => {
      /* eslint-disable camelcase */
      const rustMock = {
        channel_id: '1',
        state: 'Open',
        next_inbox_nonce: '5',
        next_outbox_nonce: '6',
        latest_response_received_message_nonce: '4',
        max_outgoing_messages: 10,
        maybe_owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        channel_reserve_fee: '1000',
      }
      /* eslint-enable camelcase */

      const result = codecToChannel(rustMock)
      expect(result).toEqual({
        channelId: '1',
        state: 'Open',
        nextInboxNonce: '5',
        nextOutboxNonce: '6',
        latestResponseReceivedMessageNonce: '4',
        maxOutgoingMessages: 10,
        maybeOwner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        channelReserveFee: '1000',
      })
    })

    it('should parse camelCase JSON format into Channel', () => {
      const camelChannel = {
        channelId: '2',
        state: 'Initiated',
        nextInboxNonce: '0',
        nextOutboxNonce: '1',
        latestResponseReceivedMessageNonce: null,
        maxOutgoingMessages: 5,
        maybeOwner: null,
        channelReserveFee: '500',
      }

      const result = codecToChannel(camelChannel)
      expect(result).toEqual({
        channelId: '2',
        state: 'Initiated',
        nextInboxNonce: '0',
        nextOutboxNonce: '1',
        latestResponseReceivedMessageNonce: null,
        maxOutgoingMessages: 5,
        maybeOwner: null,
        channelReserveFee: '500',
      })
    })

    it('should unwrap toJSON when codec provides toJSON method', () => {
      /* eslint-disable camelcase */
      const mockCodec = {
        toJSON: () => ({
          channel_id: '3',
          state: 'Closed',
          next_inbox_nonce: '10',
          next_outbox_nonce: '10',
          latest_response_received_message_nonce: null,
          max_outgoing_messages: 0,
          maybe_owner: null,
          channel_reserve_fee: '0',
        }),
      }
      /* eslint-enable camelcase */

      const result = codecToChannel(mockCodec)
      expect(result).not.toBeNull()
      expect(result?.channelId).toBe('3')
      expect(result?.state).toBe('Closed')
    })
  })
})
