/**
 * Mock function for sending Google Analytics events
 * This is a placeholder for the real function from @next/third-parties/google
 *
 * @param eventType - Type of the event (e.g., 'event')
 * @param eventName - Name of the event
 * @param eventParams - Additional parameters for the event
 */
export const sendGAEvent = (
  eventType: string,
  eventName: string,
  eventParams?: Record<string, unknown>,
): void => {
  // In a real implementation, this would call the actual Google Analytics function
  // For this design system, we're just logging to console
  console.log(`[Analytics] ${eventType}: ${eventName}`, eventParams)
}
