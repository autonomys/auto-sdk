import { api } from './api'

export const totalIssuance = async (networkId?: string) => {
  // Get the api instance for the network
  const API = await api(networkId)

  // Get the current total token issuance
  const totalIssuance = await API.query.balances.totalIssuance()

  return totalIssuance
}
