import type { ApiPromise } from '@polkadot/api'
import { createType } from '@polkadot/types'
import { Codec } from '../types/query'

export const createAccountIdType = (api: ApiPromise, address: string) =>
  createType(api.registry, 'AccountId', address).toU8a()

export const createDomainsChainIdType = (api: ApiPromise, domainId?: string | number) =>
  createType(
    api.registry,
    'SpDomainsChainId',
    domainId ? { Domain: domainId } : { Consensus: null },
  )

export const createAccountId20Type = (api: ApiPromise, address: string) =>
  createType(api.registry, 'AccountId20', address)

export const createAccountId32Type = (api: ApiPromise, address: string) =>
  createType(api.registry, 'AccountId32', address)

export const createMultiAccountIdType = (
  api: ApiPromise,
  account: { accountId20?: Codec; accountId32?: Codec },
) => {
  if (!account.accountId20 && !account.accountId32)
    throw new Error('Both accountId20 and accountId32 is undefined')
  if (account.accountId20 && account.accountId32)
    throw new Error('Both accountId20 and accountId32 are defined, define only one')
  return createType(
    api.registry,
    'DomainRuntimePrimitivesMultiAccountId',
    account.accountId20
      ? {
          AccountId20: account.accountId20,
        }
      : { AccountId32: account.accountId32 },
  )
}

export const createTransporterLocationType = (api: ApiPromise, chainId: Codec, accountId: Codec) =>
  createType(api.registry, 'PalletTransporterLocation', {
    chainId,
    accountId,
  })

export const createTransporterToConsensusType = (api: ApiPromise, accountId32: string) => {
  const chainId = createDomainsChainIdType(api)
  const accountId = createMultiAccountIdType(api, {
    accountId32: createAccountId32Type(api, accountId32),
  })
  return createTransporterLocationType(api, chainId, accountId)
}

export const createTransporterToDomainAccount20Type = (
  api: ApiPromise,
  destinationDomainId: string | number,
  accountId20: string,
) => {
  const chainId = createDomainsChainIdType(api, destinationDomainId)
  const accountId = createMultiAccountIdType(api, {
    accountId20: createAccountId20Type(api, accountId20),
  })
  return createTransporterLocationType(api, chainId, accountId)
}

export const createTransporterToDomainAccount32Type = (
  api: ApiPromise,
  destinationDomainId: string | number,
  accountId32: string,
) => {
  const chainId = createDomainsChainIdType(api, destinationDomainId)
  const accountId = createMultiAccountIdType(api, {
    accountId32: createAccountId32Type(api, accountId32),
  })
  return createTransporterLocationType(api, chainId, accountId)
}
