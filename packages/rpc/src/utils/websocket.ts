import Websocket from 'websocket'

export const parseData = (message: Websocket.IMessageEvent['data']): string => {
  if (typeof message === 'string') {
    return message
  } else {
    return Buffer.from(message).toString('utf8')
  }
}
export const parseMessage = (message: Websocket.Message): string => {
  if (message.type === 'utf8') {
    return parseData(message.utf8Data)
  } else {
    return parseData(message.binaryData)
  }
}

export const encodeMessage = (message: Websocket.IMessageEvent['data']): Buffer => {
  if (typeof message === 'string') {
    return Buffer.from(message)
  } else {
    return Buffer.from(message)
  }
}
