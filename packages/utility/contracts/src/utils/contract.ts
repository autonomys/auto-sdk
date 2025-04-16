import { Contract, JsonRpcProvider, Wallet } from 'ethers'
import { WAI3ABI } from '../abi'
import type { ContractOptions } from '../types'

export const WAI3Contract = (options: ContractOptions) => {
  const { address, privateKey, rpcUrl } = options

  const provider = new JsonRpcProvider(rpcUrl)
  const wallet = new Wallet(privateKey, provider)

  return new Contract(address, WAI3ABI, wallet)
}
