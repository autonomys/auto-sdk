import {
  parseBN,
  parseBalance,
  parseWithdrawalInShares,
  parseString,
} from '../src/utils/parse'
import type { RawBalanceData } from '../src/types/balance'
import type { RawWithdrawal } from '../src/types/staking'

describe('Parse utilities in auto-consensus', () => {
  describe('parseBN', () => {
    it('converts BN-like object with toString() to BigInt', () => {
      const mockBN = { toString: () => '1234567890123456789' } as any
      expect(parseBN(mockBN)).toBe(BigInt('1234567890123456789'))
    })
  })

  describe('parseBalance', () => {
    it('parses RawBalanceData into BalanceData with BigInt fields', () => {
      const rawBalance: RawBalanceData = {
        free: { toString: () => '1000' } as any,
        reserved: { toString: () => '200' } as any,
        frozen: { toString: () => '50' } as any,
        flags: { toString: () => '0' } as any,
      }

      const balance = parseBalance(rawBalance)
      expect(balance).toEqual({
        free: BigInt(1000),
        reserved: BigInt(200),
        frozen: BigInt(50),
        flags: BigInt(0),
      })
    })

    it('throws wrapped Error when parsing invalid balance data', () => {
      const invalidRaw = {
        free: null,
      } as any

      expect(() => parseBalance(invalidRaw)).toThrow('Failed to parse balance')
    })
  })

  describe('parseWithdrawalInShares', () => {
    it('parses withdrawal in shares struct properly with BigInt values', () => {
      const raw: NonNullable<RawWithdrawal['withdrawalInShares']> = {
        domainEpoch: [1, 42],
        unlockAtConfirmedDomainBlockNumber: 1000,
        shares: '500000000',
        storageFeeRefund: '1000000',
      }

      const result = parseWithdrawalInShares(raw)
      expect(result).toEqual({
        domainEpoch: [1, 42],
        unlockAtConfirmedDomainBlockNumber: 1000,
        shares: BigInt('500000000'),
        storageFeeRefund: BigInt('1000000'),
      })
    })
  })

  describe('parseString', () => {
    it('returns original string when given a string input', () => {
      expect(parseString('123')).toBe('123')
      expect(parseString('mainnet')).toBe('mainnet')
    })

    it('converts number to string', () => {
      expect(parseString(456)).toBe('456')
      expect(parseString(0)).toBe('0')
    })

    it('converts bigint to string', () => {
      expect(parseString(BigInt(789))).toBe('789')
      expect(parseString(BigInt('1000000000000000000'))).toBe('1000000000000000000')
    })
  })
})
