import { ethers } from 'ethers'

export class AutoKeyStore {
  private contract: ethers.Contract

  constructor(
    providerOrSigner: ethers.providers.Provider | ethers.Signer,
    contractAddress: string,
    abi: any,
  ) {
    this.contract = new ethers.Contract(contractAddress, abi, providerOrSigner)
  }

  async setValue(key: string, value: string): Promise<ethers.ContractTransaction> {
    return this.contract.setValue(key, value)
  }

  async getValue(key: string): Promise<string> {
    return this.contract.getValue(key)
  }

  async grantWriterRole(account: string): Promise<ethers.ContractTransaction> {
    return this.contract.grantWriterRole(account)
  }

  async grantEditorRole(account: string): Promise<ethers.ContractTransaction> {
    return this.contract.grantEditorRole(account)
  }

  async setMultipleValues(keys: string[], values: string[]): Promise<ethers.ContractTransaction> {
    return this.contract.setMultipleValues(keys, values)
  }

  async getMultipleValues(keys: string[]): Promise<string[]> {
    return this.contract.getMultipleValues(keys)
  }
}
