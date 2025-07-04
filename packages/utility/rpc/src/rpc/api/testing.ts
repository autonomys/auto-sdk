import Websocket from 'websocket'

// connection is not used in the mock server, but it is required by the type
export const createMockConnection = (): Websocket.connection =>
  null as unknown as Websocket.connection
