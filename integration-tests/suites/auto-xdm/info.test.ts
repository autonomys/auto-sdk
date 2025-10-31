import { chainAllowlist, channels, domainBalances, nextChannelId } from '@autonomys/auto-xdm'
import { cleanupChains, setupChains, setupXDM } from '../../helpers'

describe('XDM Info Functions', () => {
  let apis: Awaited<ReturnType<typeof setupChains>>

  beforeAll(async () => {
    apis = await setupChains()
    // Setup XDM between consensus and domain before running tests
    await setupXDM(apis.consensus, apis.domain, 0)
  }, 30000)

  afterAll(async () => {
    await cleanupChains(apis)
  }, 10000)

  describe('chainAllowlist()', () => {
    test('should query chain allowlist from consensus chain', async () => {
      const consensusAllowlist = await chainAllowlist(apis.consensus)
      const allowlistJson = consensusAllowlist.toJSON() as Array<{ domain?: number }>
      expect(allowlistJson).toEqual([{ domain: 0 }])
    })
    test('should query chain allowlist from domain chain', async () => {
      const domainAllowlist = await chainAllowlist(apis.domain)
      const allowlistJson = domainAllowlist.toJSON() as Array<{ consensus?: null }>
      expect(allowlistJson).toEqual([{ consensus: null }])
    })
  })

  describe('nextChannelId()', () => {
    test('should query next channel ID for domain 0', async () => {
      const nextId = await nextChannelId(apis.consensus, { domainId: 0 })
      expect(nextId).toBeDefined()
      expect(!nextId.isEmpty).toBe(true)
      // Should be > 0 since we set up XDM in beforeAll
      expect(BigInt(nextId.toString())).toBeGreaterThan(0n)
    })
  })

  describe('channels()', () => {
    test('should query a specific channel to domain 0', async () => {
      // First get the next channel ID to know what channels exist
      const nextId = await nextChannelId(apis.consensus, { domainId: 0 })
      const nextIdBigInt = BigInt(nextId.toString())

      // Channels exist since we set up XDM in beforeAll
      expect(nextIdBigInt).toBeGreaterThan(0n)

      // Query the first channel (ID starts at 1)
      const channel = await channels(apis.consensus, { domainId: 0 }, 1)
      expect(channel).toBeDefined()
      expect(!channel.isEmpty).toBe(true)
    })
  })

  describe('domainBalances()', () => {
    test('should query balance for domain 0', async () => {
      const balance = await domainBalances(apis.consensus, 0)
      expect(balance).toBeDefined()
    })
    test('should query all domain balances from consensus chain', async () => {
      const balances = await domainBalances(apis.consensus)
      expect(balances).toBeDefined()
      expect(Array.isArray(balances)).toBe(true)
    })
  })
})
