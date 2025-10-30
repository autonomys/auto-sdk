#!/usr/bin/env node
/**
 * Wait for all chains to be ready before running tests
 * Usage: node wait-for-ready.ts
 */

import { waitForAllChainsReady } from '../helpers'

const main = async () => {
  try {
    console.log('Checking if chains are ready...')
    await waitForAllChainsReady()
    console.log('✅ All chains are ready!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Chains failed to start:', error)
    process.exit(1)
  }
}

main()

