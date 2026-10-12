import {
  type Api,
  type ApiPromise,
  activate,
  activateDomain,
  disconnect,
} from '@autonomys/auto-utils'
import { account } from '../src/account'
import { balance, totalIssuance } from '../src/balances'

jest.mock('../src/account', () => ({
  account: jest.fn(),
}))

jest.mock('@autonomys/auto-utils', () => {
  const actual = jest.requireActual('@autonomys/auto-utils')
  return {
    ...actual,
    activate: jest.fn(),
    activateDomain: jest.fn(),
    disconnect: jest.fn(),
  }
})

const mockAccount = account as jest.MockedFunction<typeof account>
const mockActivate = activate as jest.MockedFunction<typeof activate>
const mockActivateDomain = activateDomain as jest.MockedFunction<typeof activateDomain>
const mockDisconnect = disconnect as jest.MockedFunction<typeof disconnect>

describe('balances module unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('totalIssuance', () => {
    it('uses provided Api directly without activating or disconnecting', async () => {
      const mockApi = {
        query: {
          balances: {
            totalIssuance: jest.fn().mockResolvedValue('1000000000000000'),
          },
        },
      } as unknown as Api

      const result = await totalIssuance(mockApi)
      expect(result).toBe('1000000000000000')
      expect(mockActivate).not.toHaveBeenCalled()
      expect(mockActivateDomain).not.toHaveBeenCalled()
      expect(mockDisconnect).not.toHaveBeenCalled()
    })

    it('activates and disconnects connection when querying consensus by networkId', async () => {
      const mockApi = {
        query: {
          balances: {
            totalIssuance: jest.fn().mockResolvedValue('2500000000000000'),
          },
        },
      }

      mockActivate.mockResolvedValue(mockApi as unknown as ApiPromise)
      mockDisconnect.mockResolvedValue(undefined)

      const result = await totalIssuance('taurus')
      expect(result).toBe('2500000000000000')
      expect(mockActivate).toHaveBeenCalledWith({ networkId: 'taurus' })
      expect(mockDisconnect).toHaveBeenCalledWith(mockApi)
    })

    it('activates domain and disconnects connection when querying domain parameters', async () => {
      const mockApi = {
        query: {
          balances: {
            totalIssuance: jest.fn().mockResolvedValue('5000000000000000'),
          },
        },
      }

      mockActivateDomain.mockResolvedValue(mockApi as unknown as ApiPromise)
      mockDisconnect.mockResolvedValue(undefined)

      const result = await totalIssuance({ networkId: 'taurus', domainId: '0' })
      expect(result).toBe('5000000000000000')
      expect(mockActivateDomain).toHaveBeenCalledWith({ networkId: 'taurus', domainId: '0' })
      expect(mockDisconnect).toHaveBeenCalledWith(mockApi)
    })

    it('ensures disconnect is called even when query fails', async () => {
      const mockApi = {
        query: {
          balances: {
            totalIssuance: jest.fn().mockRejectedValue(new Error('Storage query failure')),
          },
        },
      }

      mockActivate.mockResolvedValue(mockApi as unknown as ApiPromise)
      mockDisconnect.mockResolvedValue(undefined)

      await expect(totalIssuance('taurus')).rejects.toThrow('Storage query failure')
      expect(mockDisconnect).toHaveBeenCalledWith(mockApi)
    })
  })

  describe('balance', () => {
    it('returns parsed BalanceData from account', async () => {
      const mockApi = {} as Api
      const mockBalanceData = {
        free: BigInt(1000),
        reserved: BigInt(200),
        frozen: BigInt(0),
        flags: BigInt(0),
      }

      mockAccount.mockResolvedValue({
        nonce: BigInt(1),
        data: mockBalanceData,
      })

      const res = await balance(mockApi, '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
      expect(res).toEqual(mockBalanceData)
    })

    it('wraps and rethrows errors with cause on account query failure', async () => {
      const mockApi = {} as Api
      mockAccount.mockRejectedValue(new Error('Connection reset'))

      await expect(
        balance(mockApi, '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
      ).rejects.toThrow(/Error getting balance: Connection reset/)
    })
  })
})
