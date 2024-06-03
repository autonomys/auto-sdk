import { api } from './api'

export const currentTimestamp = async (networkId?: string) => {
  // Get the api instance for the network
  const API = await api(networkId)

  // Get the current timestamp
  const timestamp = await API.query.timestamp.now()

  return timestamp
}
