import { activate, disconnect } from '@autonomys/auto-utils'
import { totalIssuance } from '../src/balances'

describe('Verify balances functions', () => {
  beforeAll(async () => {
    await activate()
  })

  afterAll(async () => {
    await disconnect()
  })

  test('Check totalIssuance return a number greater than zero', async () => {
    // totalIssuance is an async function that returns a hex number as a string
    const rawIssuance = await totalIssuance()
    // Convert the hex number to a BigInt
    const issuance = BigInt(rawIssuance.toString())
    // Check if the issuance is greater than zero
    expect(issuance).toBeGreaterThan(BigInt(0))
  })
})
