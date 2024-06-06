import { activate, disconnect } from '@autonomys/auto-utils'
import { currentTimestamp } from '../src/info'

describe('Verify info functions', () => {
  beforeAll(async () => {
    await activate()
  })

  // afterAll(async () => {
  //   await disconnect()
  // })

  test('Check timestamp return a number greater than zero', async () => {
    // totalIssuance is an async function that returns a hex number as a string
    const rawTimestamp = await currentTimestamp()
    // Convert the hex number to a BigInt
    const timestamp = BigInt(rawTimestamp.toString())
    // Check if the issuance is greater than zero
    expect(timestamp).toBeGreaterThan(BigInt(0))
  })
})
