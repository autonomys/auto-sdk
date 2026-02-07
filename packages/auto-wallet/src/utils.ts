/**
 * Shortens a blockchain address for display purposes.
 * @param addr - The full address string
 * @param length - Number of characters to show on each side (default: 4)
 * @returns Shortened address like "5Grwva\u2026EHDf" or empty string if no address
 */
export const shortenAddress = (addr?: string, length = 4): string => {
  if (!addr) return '';
  return `${addr.slice(0, length + 2)}\u2026${addr.slice(-length)}`;
};
