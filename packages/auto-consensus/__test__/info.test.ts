import { blockHash, blockNumber, networkTimestamp } from '@autonomys/auto-consensus'
import { activate, disconnect, type ApiPromise } from '@autonomys/auto-utils'
import { setup } from './helpers'

describe('Verify info functions', () => {
  const { TEST_NETWORK } = setup()

  let api: ApiPromise

  beforeAll(async () => {
    api = await activate(TEST_NETWORK)
  }, 15000)

  afterAll(async () => {
    await disconnect(api)
  }, 10000)

  test('Check network timestamp return a number greater than zero', async () => {
    // networkTimestamp is an async function that returns a Codec timestamp
    const rawTimestamp = await networkTimestamp(api)
    // Convert the hex number to a BigInt
    const timestamp = BigInt(rawTimestamp.toString())
    // Check if the timestamp is greater than zero
    expect(timestamp).toBeGreaterThan(BigInt(0))
  }, 15000)

  test('Check blockNumber return a number greater than zero', async () => {
    expect(await blockNumber(api)).toBeGreaterThan(0)
  }, 15000)

  test('Check blockHash return a hex greater than 0x', async () => {
    const _blockHash = await blockHash(api)
    expect(_blockHash).toMatch(/^0x/)
    expect(_blockHash.length).toBeGreaterThan(2)
  }, 15000)
})
