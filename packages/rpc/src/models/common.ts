import z from 'zod'

export type Serializable = ReturnType<typeof JSON.stringify>

export const messageSchema = z.object({
  jsonrpc: z.string(),
  method: z.string(),
  params: z.any(),
  id: z.number(),
})

export type Message = z.infer<typeof messageSchema>

export type MessageQuery = Omit<Message, 'id'> & { id?: number }
