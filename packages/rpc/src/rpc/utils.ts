export const errorResponse = (code: number, message: string) => {
  return {
    error: {
      code,
      message,
    },
  }
}

export class RpcError extends Error {
  constructor(
    message: string,
    public code: number,
  ) {
    super(message)
  }
}
