// Mock for stream-fork in browser environment
import { PassThrough } from 'stream-browserify'

const mockStreamFork = {
  fork: () => {
    // Create a simple pass-through stream that doesn't actually fork
    // This is just for display purposes in Storybook
    return new PassThrough()
  },
}

export default mockStreamFork
