import Websocket from 'websocket'

export const parseData = (message: Websocket.IMessageEvent['data']): string => {
  if (typeof message === 'string') {
    return message
  }
  if (Buffer.isBuffer(message)) {
    return message.toString('utf8')
  }
  return Buffer.from(message).toString('utf8')
}
export const parseMessage = (message: Websocket.Message): string => {
  if (message.type === 'utf8') {
    return parseData(message.utf8Data)
  } else {
    return message.binaryData.toString('utf-8')
  }
}

export const encodeMessageData = (message: Websocket.IMessageEvent['data']): Buffer => {
  if (typeof message === 'string') {
    return Buffer.from(message)
  }
  if (Buffer.isBuffer(message)) {
    return message
  }
  return Buffer.from(message)
}

export const encodeMessage = (message: Websocket.IMessageEvent['data']): Websocket.Message => {
  return {
    type: 'utf8',
    utf8Data: encodeMessageData(message).toString('utf8'),
  }
}
