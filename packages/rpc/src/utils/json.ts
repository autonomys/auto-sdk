export const safeParseJson = (json: string) => {
  try {
    return JSON.parse(json)
  } catch (error) {
    return null
  }
}
