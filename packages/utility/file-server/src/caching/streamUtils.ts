import { PassThrough, Readable } from 'stream'

export interface StreamHealthMetrics {
  isStalled: boolean
  lastActivity: number
  isDestroyed: boolean
}

export interface ErrorResilientStreamOptions {
  stallTimeout?: number
  healthCheckInterval?: number
}

interface ErrorResilientStream extends Readable {
  healthCheck?: () => StreamHealthMetrics
}

/**
 * Creates an error-resilient stream wrapper that prevents consumer errors from stalling the source stream
 * Focuses on detecting and handling stalled streams
 */
export const createErrorResilientStream = (
  sourceStream: Readable,
  options: ErrorResilientStreamOptions = {},
): ErrorResilientStream => {
  const {
    stallTimeout = 30000, // 30 seconds
    healthCheckInterval = 5000, // 5 seconds
  } = options

  const passThrough: PassThrough = new PassThrough({
    highWaterMark: 64 * 1024, // 64KB buffer to handle backpressure
    objectMode: false,
  })

  // Simple metrics for stalled stream detection
  const metrics: StreamHealthMetrics = {
    isStalled: false,
    lastActivity: Date.now(),
    isDestroyed: false,
  }

  let healthCheckTimer: NodeJS.Timeout | null = null

  // Health check function - only checks for stalled streams
  const healthCheck = (): StreamHealthMetrics => {
    const now = Date.now()
    const timeSinceLastActivity = now - metrics.lastActivity
    metrics.isStalled = timeSinceLastActivity > stallTimeout && !metrics.isDestroyed

    return { ...metrics }
  }

  // Start periodic health checks for stalled streams
  const startHealthChecks = () => {
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer)
    }

    healthCheckTimer = setInterval(() => {
      const health = healthCheck()

      if (health.isStalled) {
        console.warn('Stream detected as stalled:', {
          timeSinceLastActivity: Date.now() - health.lastActivity,
          stallTimeout,
        })

        // Destroy the stalled stream
        passThrough.destroy(new Error('Stream stalled - no activity detected'))
      }
    }, healthCheckInterval)
  }

  // Set up backpressure-aware data flow
  sourceStream.on('data', (chunk) => {
    try {
      metrics.lastActivity = Date.now()
      metrics.isStalled = false

      if (!passThrough.destroyed) {
        const canContinue = passThrough.write(chunk)
        if (!canContinue) {
          // Backpressure: pause source stream until drain event
          sourceStream.pause()
        }
      }
    } catch (error) {
      console.error('Error processing stream data:', error)
      // Don't destroy the stream on consumer errors, just log
    }
  })

  // Resume source stream when pass-through is ready for more data
  passThrough.on('drain', () => {
    if (!sourceStream.destroyed && !passThrough.destroyed) {
      sourceStream.resume()
    }
  })

  // Handle source stream end
  sourceStream.on('end', () => {
    if (!passThrough.destroyed) {
      passThrough.end()
    }
    metrics.lastActivity = Date.now()
  })

  // Handle source stream errors
  sourceStream.on('error', (error) => {
    console.error('Source stream error:', error)
    metrics.lastActivity = Date.now()
    passThrough.destroy(error)
  })

  // Handle pass-through stream errors (consumer errors)
  passThrough.on('error', (error) => {
    console.error('Consumer stream error:', error)
    metrics.lastActivity = Date.now()
    // Don't propagate consumer errors to source stream
  })

  // Handle pass-through stream on end
  passThrough.on('end', () => {
    metrics.lastActivity = Date.now()
    if (healthCheckTimer) clearInterval(healthCheckTimer)
  })

  // Handle pass-through stream close
  passThrough.on('close', () => {
    metrics.isDestroyed = true
    metrics.lastActivity = Date.now()

    if (healthCheckTimer) {
      clearInterval(healthCheckTimer)
    }
  })

  // Start health monitoring
  startHealthChecks()

  const errorResilientStream: ErrorResilientStream = passThrough as ErrorResilientStream
  errorResilientStream.healthCheck = healthCheck

  return errorResilientStream
}
