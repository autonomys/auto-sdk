import {
  createDomainsChainIdType,
  createMultiAccountIdType,
  createAccountId32Type,
  createAccountId20Type,
  createTransporterLocationType,
  type ApiPromise,
} from '@autonomys/auto-utils'
import { transporterTransfer } from '../src/transfer'

jest.mock('@autonomys/auto-utils', () => ({
  createDomainsChainIdType: jest.fn().mockReturnValue('chain-id-codec'),
  createMultiAccountIdType: jest.fn().mockReturnValue('multi-account-codec'),
  createAccountId32Type: jest.fn().mockReturnValue('account-32-codec'),
  createAccountId20Type: jest.fn().mockReturnValue('account-20-codec'),
  createTransporterLocationType: jest.fn().mockReturnValue('location-codec'),
}))

describe('auto-xdm transfer', () => {
  const mockTx = { hash: '0xtransfer' }

  const mockApi = {
    tx: {
      transporter: {
        transfer: jest.fn().mockReturnValue(mockTx),
      },
    },
  } as unknown as ApiPromise

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create transporter transfer to consensus with accountId32', () => {
    const tx = transporterTransfer(
      mockApi,
      'consensus',
      { accountId32: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' },
      '1000000000000000000',
    )

    expect(createDomainsChainIdType).toHaveBeenCalledWith(mockApi)
    expect(createAccountId32Type).toHaveBeenCalledWith(
      mockApi,
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    )
    expect(createMultiAccountIdType).toHaveBeenCalledWith(mockApi, {
      accountId32: 'account-32-codec',
    })
    expect(createTransporterLocationType).toHaveBeenCalledWith(
      mockApi,
      'chain-id-codec',
      'multi-account-codec',
    )
    expect(mockApi.tx.transporter.transfer).toHaveBeenCalledWith(
      'location-codec',
      '1000000000000000000',
    )
    expect(tx).toBe(mockTx)
  })

  it('should create transporter transfer to domain with accountId20 EVM address', () => {
    const tx = transporterTransfer(
      mockApi,
      { domainId: 0 },
      { accountId20: '0x1234567890abcdef1234567890abcdef12345678' },
      5000000n,
    )

    expect(createDomainsChainIdType).toHaveBeenCalledWith(mockApi, 0)
    expect(createAccountId20Type).toHaveBeenCalledWith(
      mockApi,
      '0x1234567890abcdef1234567890abcdef12345678',
    )
    expect(createMultiAccountIdType).toHaveBeenCalledWith(mockApi, {
      accountId20: 'account-20-codec',
    })
    expect(createTransporterLocationType).toHaveBeenCalledWith(
      mockApi,
      'chain-id-codec',
      'multi-account-codec',
    )
    expect(mockApi.tx.transporter.transfer).toHaveBeenCalledWith('location-codec', 5000000n)
    expect(tx).toBe(mockTx)
  })
})
