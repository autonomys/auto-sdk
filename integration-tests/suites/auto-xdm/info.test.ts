import { chainAllowlist, channels, domainBalances } from '@autonomys/auto-xdm'
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
      expect(consensusAllowlist).toEqual([{ domainId: 0 }])
    })
    test('should query chain allowlist from domain chain', async () => {
      const domainAllowlist = await chainAllowlist(apis.domain)
      expect(domainAllowlist).toEqual(['consensus'])
    })
  })

  describe('channels()', () => {
    test('should query a specific channel to domain 0', async () => {
      // Query the first channel (ID starts at 0)
      const channel = await channels(apis.consensus, { domainId: 0 }, 0)
      expect(channel).not.toBeNull()
      expect(channel).toMatchObject({
        channelId: expect.any(String),
        state: expect.stringMatching(/^(Initiated|Open|Closed)$/),
        nextInboxNonce: expect.any(String),
        nextOutboxNonce: expect.any(String),
        maxOutgoingMessages: expect.any(Number),
        channelReserveFee: expect.any(String),
      })
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
