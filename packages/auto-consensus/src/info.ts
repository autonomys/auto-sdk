import { activate } from './api'

export const currentTimestamp = async (networkId?: string) => {
  // Get the api instance for the network
  const api = await activate(networkId)

  // Get the current timestamp
  const timestamp = await api.query.timestamp.now()

  return timestamp
}
