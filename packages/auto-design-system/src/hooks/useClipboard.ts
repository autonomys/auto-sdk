import { useCallback, useState } from 'react'

interface UseClipboardOptions {
  timeout?: number
}

interface UseClipboardReturn {
  value: string
  onCopy: () => void
  hasCopied: boolean
}

/**
 * A hook for copying text to the clipboard
 */
export function useClipboard(
  text: string,
  { timeout = 1500 }: UseClipboardOptions = {},
): UseClipboardReturn {
  const [hasCopied, setHasCopied] = useState(false)

  const onCopy = useCallback(() => {
    try {
      navigator.clipboard.writeText(text)
      setHasCopied(true)

      setTimeout(() => {
        setHasCopied(false)
      }, timeout)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }, [text, timeout])

  return { value: text, onCopy, hasCopied }
}
