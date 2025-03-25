import { Message, MessageQuery } from './common'

export type ClientRPC = {
  send: (message: MessageQuery) => Promise<Message>
  on: (callback: (event: Message) => void) => void
  off: (callback: (event: Message) => void) => void
  close: () => void
}
