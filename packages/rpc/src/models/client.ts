import { Message } from './common'

export type ClientRPC = {
  send: (message: Omit<Message, 'id'>) => Promise<Message>
  on: (callback: (event: Message) => void) => void
  off: (callback: (event: Message) => void) => void
  close: () => void
}
