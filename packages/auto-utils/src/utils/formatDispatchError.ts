export const formatDispatchError = <TError>(
  dispatchError: unknown,
  mapErrorCodeToEnum?: (errorCode: string) => TError | undefined,
): { errorEnum: TError | undefined; formattedError: string } => {
  if (!dispatchError) {
    return { errorEnum: undefined, formattedError: 'Unknown dispatch error' }
  }

  const rawStr =
    typeof dispatchError === 'object' && dispatchError !== null && 'toString' in dispatchError
      ? (dispatchError as { toString: () => string }).toString()
      : String(dispatchError)

  let errorCode: string | undefined
  let formattedError = rawStr

  try {
    const parsed = JSON.parse(rawStr)
    if (parsed && typeof parsed === 'object') {
      formattedError = JSON.stringify(parsed)
      const moduleRecord = (parsed as { module?: Record<string, unknown> }).module
      if (moduleRecord && typeof moduleRecord === 'object' && moduleRecord.error !== undefined) {
        errorCode = String(moduleRecord.error)
      } else if ('error' in parsed) {
        errorCode = String((parsed as { error: unknown }).error)
      }
    }
  } catch {
    // rawStr is not JSON, e.g. "BadOrigin", "CannotLookup", etc.
    formattedError = rawStr
  }

  if (!errorCode && typeof dispatchError === 'object' && dispatchError !== null) {
    const anyErr = dispatchError as { isModule?: boolean; asModule?: { error?: unknown } }
    if (anyErr.isModule && anyErr.asModule && anyErr.asModule.error !== undefined) {
      errorCode = String(anyErr.asModule.error)
    }
  }

  const errorEnum = errorCode && mapErrorCodeToEnum ? mapErrorCodeToEnum(errorCode) : undefined
  return { errorEnum, formattedError }
}
