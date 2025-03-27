import { ClientRPCListener } from '../rpc'
import { MessageQuery, MessageResponse } from './common'

export type ClientRPC = {
  send: (message: MessageQuery) => Promise<MessageResponse>
  on: (callback: ClientRPCListener) => void
  off: (callback: ClientRPCListener) => void
  close: () => void
}
