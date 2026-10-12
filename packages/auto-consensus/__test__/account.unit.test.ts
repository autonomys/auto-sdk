import type { Api } from '@autonomys/auto-utils'
import { account } from '../src/account'

describe('account module unit tests', () => {
  it('parses raw account nonce and balance data accurately', async () => {
    const rawAccountData = {
      nonce: '5',
      data: {
        free: '1000000000000000000',
        reserved: '500000000000000000',
        frozen: '0',
        flags: '170141183460469231731687303715884105728',
      },
    }

    const mockApi = {
      query: {
        system: {
          account: jest.fn().mockResolvedValue({
            toPrimitive: () => rawAccountData,
          }),
        },
      },
    } as unknown as Api

    const result = await account(mockApi, '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')

    expect(result).toEqual({
      nonce: BigInt(5),
      data: {
        free: BigInt('1000000000000000000'),
        reserved: BigInt('500000000000000000'),
        frozen: BigInt(0),
        flags: BigInt('170141183460469231731687303715884105728'),
      },
    })
    expect(mockApi.query.system.account).toHaveBeenCalledWith(
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    )
  })

  it('wraps and rethrows error with cause when query fails', async () => {
    const mockApi = {
      query: {
        system: {
          account: jest.fn().mockRejectedValue(new Error('Codec decode error')),
        },
      },
    } as unknown as Api

    await expect(
      account(mockApi, '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
    ).rejects.toThrow(/Error getting account: Codec decode error/)
  })
})
