// Helper function to safely parse JSON with a fallback
export function tryParseJson(jsonString: string, fallback: string): string {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return fallback; // Return the original string if it's not JSON
  }
}