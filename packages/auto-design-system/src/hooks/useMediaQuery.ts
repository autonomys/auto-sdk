import { useEffect, useState } from 'react'

/**
 * Hook that tracks state of a CSS media query
 * @param query - Media query string to evaluate
 * @returns Boolean indicating if the media query matches
 */
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Initialize with the current state
    const media = window.matchMedia(query)
    setMatches(media.matches)

    // Create handler for changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener for subsequent changes
    media.addEventListener('change', listener)

    // Clean up
    return () => {
      media.removeEventListener('change', listener)
    }
  }, [query])

  return matches
}
