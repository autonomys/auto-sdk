import z from 'zod'

export type Serializable = ReturnType<typeof JSON.stringify>

export const messageSchema = z.object({
  jsonrpc: z.string(),
  method: z.string(),
  params: z.any(),
  id: z.number().optional(),
})

export type Message = z.infer<typeof messageSchema>

export type MessageQuery = Omit<Message, 'id'> & { id?: number }

export type MessageResponse = {
  jsonrpc: string
  error?: {
    code: number
    message: string
    data?: any
  }
  result?: any
  id: number
}

export type MessageResponseQuery = Omit<MessageResponse, 'id' | 'jsonrpc'> & {
  id?: number
  jsonrpc?: string
}
