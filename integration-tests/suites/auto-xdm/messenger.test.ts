import { setupWallet, signAndSendTx } from '@autonomys/auto-utils'
import {
  chainAllowlist,
  channels,
  closeChannel,
  initiateChannel,
  nextChannelId,
  type Chain,
} from '@autonomys/auto-xdm'
import { cleanupChains, setupChains, setupXDM, waitUntil } from '../../helpers'

describe('XDM Messenger Functions', () => {
  let apis: Awaited<ReturnType<typeof setupChains>>
  let ownerWallet: ReturnType<typeof setupWallet>

  beforeAll(async () => {
    apis = await setupChains()
    ownerWallet = setupWallet({ uri: '//Alice' })

    if (!ownerWallet.keyringPair) {
      throw new Error('Owner keyring pair not initialized')
    }

    // Setup XDM between consensus and domain before running tests
    await setupXDM(apis.consensus, apis.domain, 0)
  }, 300000) // Increased timeout to allow chains to start and XDM to be set up

  afterAll(async () => {
    await cleanupChains(apis)
  }, 10000)

  describe('initiateChannel()', () => {
    test('should successfully initiate and open a channel', async () => {
      // Verify destination is in allowlist first
      const allowlist = await chainAllowlist(apis.consensus)
      const canOpenToDomain0 = allowlist.some(
        (chain) => chain !== 'consensus' && chain.domainId === 0,
      )
      expect(canOpenToDomain0).toBe(true)

      // Check current nextChannelId to find what channel ID will be created
      const nextIdBefore = await nextChannelId(apis.consensus, { domainId: 0 })
      const expectedChannelId = Number(nextIdBefore.toString())

      // Create and submit transaction using wrapper function
      const destination: Chain = { domainId: 0 }
      const tx = initiateChannel(apis.consensus, destination)

      // Submit the transaction
      await signAndSendTx(ownerWallet.keyringPair!, tx, {}, [], false)

      // Wait for channel to open
      await waitUntil(async () => {
        const channel = await channels(apis.consensus, { domainId: 0 }, expectedChannelId)
        return channel !== null && channel.state === 'Open'
      })

      // Verify channel was created and is open
      const channel = await channels(apis.consensus, { domainId: 0 }, expectedChannelId)
      expect(channel).not.toBeNull()
      expect(channel?.state).toBe('Open')
    }, 300000)
  })

  describe('closeChannel()', () => {
    test('should successfully close an open channel', async () => {
      const nextId = await nextChannelId(apis.consensus, { domainId: 0 })
      const channelCount = Number(nextId.toString())

      // If no channels exist, skip test
      if (channelCount === 0) {
        console.log('No channels exist to close, skipping test')
        return
      }

      // Find the first open channel
      let channelIdToClose: number | null = null
      for (let i = 0; i < channelCount; i++) {
        const channel = await channels(apis.consensus, { domainId: 0 }, i)
        if (channel && channel.state === 'Open') {
          channelIdToClose = i
          break
        }
      }

      if (channelIdToClose === null) {
        console.log('No open channels found to close, skipping test')
        return
      }

      // Close the channel using wrapper function
      const destination: Chain = { domainId: 0 }
      const tx = closeChannel(apis.consensus, destination, channelIdToClose)
      await signAndSendTx(ownerWallet.keyringPair!, tx, {}, [], false)

      // Wait for channel to close
      await waitUntil(async () => {
        const channel = await channels(apis.consensus, { domainId: 0 }, channelIdToClose!)
        return channel?.state === 'Closed'
      })

      // Verify channel is closed
      const channelAfter = await channels(apis.consensus, { domainId: 0 }, channelIdToClose)
      expect(channelAfter).not.toBeNull()
      expect(channelAfter?.state).toBe('Closed')
    }, 300000)
  })
})
