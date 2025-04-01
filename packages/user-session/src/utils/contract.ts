import { Contract, JsonRpcProvider, Wallet } from 'ethers'
import { UserSessionABI } from '../abi'
import type { ContractOptions } from '../types'

export const UserSessionContract = (options: ContractOptions) => {
  const { address, privateKey, rpcUrl } = options

  const provider = new JsonRpcProvider(rpcUrl)
  const wallet = new Wallet(privateKey, provider)

  return new Contract(address, UserSessionABI, wallet)
}
