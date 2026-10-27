/**
 * Reads Auto Drive's error body. It sends `{ error: <CODE>, message }` for
 * coded errors and `{ error: <message> }` for uncoded ones; anything else,
 * including non-JSON, yields neither field.
 */
export const parseErrorBody = (body: string): { code?: string; message?: string } => {
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object') {
      const { error, message } = parsed as { error?: unknown; message?: unknown }
      if (typeof message === 'string') {
        return { code: typeof error === 'string' ? error : undefined, message }
      }
      if (typeof error === 'string') {
        return { message: error }
      }
    }
  } catch {
    // Not JSON
  }
  return {}
}

/**
 * Builds an Error from a non-OK response, using the server's message when the
 * body has one and otherwise the status text, or the status code when the text
 * is empty (as it always is over HTTP/2).
 */
export const toApiError = async (response: Response, context: string): Promise<Error> => {
  const { message } = parseErrorBody(await response.text().catch(() => ''))
  return new Error(`${context}: ${message || response.statusText || response.status}`)
}
