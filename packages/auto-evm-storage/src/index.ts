// src/index.ts

import { ethers } from 'ethers'

// Utility functions
const stringToBytes32 = (str: string): string => ethers.utils.formatBytes32String(str)
const bytes32ToString = (bytes: ethers.BytesLike): string => ethers.utils.parseBytes32String(bytes)

// Helper to create a contract instance
const createContract = (
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  contractAddress: string,
  abi: any,
): ethers.Contract => new ethers.Contract(contractAddress, abi, providerOrSigner)

// AutoKeyValue functions
export const autoKeyValue = (
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  contractAddress: string,
  abi: any,
) => {
  const contract = createContract(providerOrSigner, contractAddress, abi)

  const setValue = (key: string, value: string): Promise<ethers.ContractTransaction> => {
    return contract.setValue(key, value)
  }

  const getValue = (key: string): Promise<string> => {
    return contract.getValue(key)
  }

  const grantWriterRole = (account: string): Promise<ethers.ContractTransaction> => {
    return contract.grantWriterRole(account)
  }

  const grantEditorRole = (account: string): Promise<ethers.ContractTransaction> => {
    return contract.grantEditorRole(account)
  }

  const setMultipleValues = (
    keys: string[],
    values: string[],
  ): Promise<ethers.ContractTransaction> => {
    return contract.setMultipleValues(keys, values)
  }

  const getMultipleValues = (keys: string[]): Promise<string[]> => {
    return contract.getMultipleValues(keys)
  }

  return {
    setValue,
    getValue,
    grantWriterRole,
    grantEditorRole,
    setMultipleValues,
    getMultipleValues,
  }
}

// AutoEnumerableMap functions
export const autoEnumerableMap = (
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  contractAddress: string,
  abi: any,
) => {
  const contract = createContract(providerOrSigner, contractAddress, abi)

  const set = (key: string, value: string): Promise<ethers.ContractTransaction> => {
    return contract.set(stringToBytes32(key), stringToBytes32(value))
  }

  const get = async (key: string): Promise<string> => {
    const value = await contract.get(stringToBytes32(key))
    return bytes32ToString(value)
  }

  const getKeys = async (): Promise<string[]> => {
    const keys = await contract.getKeys()
    return keys.map((key: ethers.BytesLike) => bytes32ToString(key))
  }

  const grantWriterRole = (account: string): Promise<ethers.ContractTransaction> => {
    return contract.grantWriterRole(account)
  }

  return {
    set,
    get,
    getKeys,
    grantWriterRole,
  }
}

// AutoMultiMap functions
export const autoMultiMap = (
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  contractAddress: string,
  abi: any,
) => {
  const contract = createContract(providerOrSigner, contractAddress, abi)

  const addValue = (key: string, value: string): Promise<ethers.ContractTransaction> => {
    return contract.addValue(stringToBytes32(key), stringToBytes32(value))
  }

  const getValues = async (key: string): Promise<string[]> => {
    const values = await contract.getValues(stringToBytes32(key))
    return values.map((value: ethers.BytesLike) => bytes32ToString(value))
  }

  const grantWriterRole = (account: string): Promise<ethers.ContractTransaction> => {
    return contract.grantWriterRole(account)
  }

  return {
    addValue,
    getValues,
    grantWriterRole,
  }
}

// AutoLinkedList functions
export const autoLinkedList = (
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  contractAddress: string,
  abi: any,
) => {
  const contract = createContract(providerOrSigner, contractAddress, abi)

  const addNode = (data: number): Promise<ethers.ContractTransaction> => {
    return contract.addNode(data)
  }

  const getNode = async (index: number): Promise<{ data: number; next: number }> => {
    const [data, next] = await contract.getNode(index)
    return { data: data.toNumber(), next: next.toNumber() }
  }

  const traverse = async (): Promise<number[]> => {
    const dataList = await contract.traverse()
    return dataList.map((data: ethers.BigNumber) => data.toNumber())
  }

  const grantWriterRole = (account: string): Promise<ethers.ContractTransaction> => {
    return contract.grantWriterRole(account)
  }

  return {
    addNode,
    getNode,
    traverse,
    grantWriterRole,
  }
}

// AutoStackQueue functions
export const autoStackQueue = (
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  contractAddress: string,
  abi: any,
) => {
  const contract = createContract(providerOrSigner, contractAddress, abi)

  const push = (value: number): Promise<ethers.ContractTransaction> => {
    return contract.push(value)
  }

  const pop = (): Promise<ethers.ContractTransaction> => {
    return contract.pop()
  }

  const stackTop = async (): Promise<number> => {
    const value = await contract.stackTop()
    return value.toNumber()
  }

  const stackSize = async (): Promise<number> => {
    const size = await contract.stackSize()
    return size.toNumber()
  }

  const enqueue = (value: number): Promise<ethers.ContractTransaction> => {
    return contract.enqueue(value)
  }

  const dequeue = (): Promise<ethers.ContractTransaction> => {
    return contract.dequeue()
  }

  const queueFront = async (): Promise<number> => {
    const value = await contract.queueFront()
    return value.toNumber()
  }

  const queueSize = async (): Promise<number> => {
    const size = await contract.queueSize()
    return size.toNumber()
  }

  const grantWriterRole = (account: string): Promise<ethers.ContractTransaction> => {
    return contract.grantWriterRole(account)
  }

  return {
    push,
    pop,
    stackTop,
    stackSize,
    enqueue,
    dequeue,
    queueFront,
    queueSize,
    grantWriterRole,
  }
}

// AutoEventLogger functions
export const autoEventLogger = (
  providerOrSigner: ethers.providers.Provider | ethers.Signer,
  contractAddress: string,
  abi: any,
) => {
  const contract = createContract(providerOrSigner, contractAddress, abi)

  const logAction = (action: string): Promise<ethers.ContractTransaction> => {
    return contract.logAction(action)
  }

  const getEventsCount = async (): Promise<number> => {
    const count = await contract.getEventsCount()
    return count.toNumber()
  }

  const getEvent = async (
    index: number,
  ): Promise<{ user: string; action: string; timestamp: number }> => {
    const event = await contract.getEvent(index)
    return {
      user: event.user,
      action: event.action,
      timestamp: event.timestamp.toNumber(),
    }
  }

  const getEvents = async (): Promise<
    Array<{ user: string; action: string; timestamp: number }>
  > => {
    const events = await contract.getEvents()
    return events.map((event: any) => ({
      user: event.user,
      action: event.action,
      timestamp: event.timestamp.toNumber(),
    }))
  }

  return {
    logAction,
    getEventsCount,
    getEvent,
    getEvents,
  }
}
