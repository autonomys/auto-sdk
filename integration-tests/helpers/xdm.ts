import { setupWallet, signAndSendTx, type ApiPromise } from '@autonomys/auto-utils'
import { chainAllowlist, channels, nextChannelId, type Chain } from '@autonomys/auto-xdm'
import { waitForBlocks, waitUntil } from './chain'

/**
 * Checks if a chain ID exists in the allowlist
 */
const isChainInAllowlist = (
  allowlist: Chain[],
  chainId: { Domain: number } | 'Consensus',
): boolean => {
  if (!Array.isArray(allowlist)) return false

  return allowlist.some((entry: Chain) => {
    if (typeof chainId === 'string') {
      // Check if entry is 'consensus'
      return entry === 'consensus'
    }
    // Check if entry is a domain with matching domainId
    return entry !== 'consensus' && entry.domainId === chainId.Domain
  })
}

/**
 * Sets up XDM (Cross-Domain Messaging) between consensus and domain.
 * Skips steps that have already been completed.
 *
 * @param api - The API instance connected to consensus chain
 * @param domainId - The domain ID to enable XDM with (default: 0)
 * @param sudoUri - SUDO account URI (default: //Alice)
 * @param ownerUri - Owner account URI (default: //Alice)
 */
export const setupXDM = async (
  consensusApi: ApiPromise,
  domainApi: ApiPromise,
  domainId = 0,
  sudoUri = '//Alice',
  ownerUri = '//Alice',
): Promise<void> => {
  const sudo = setupWallet({ uri: sudoUri })
  const owner = setupWallet({ uri: ownerUri })

  if (!sudo.keyringPair || !owner.keyringPair) {
    throw new Error('Sudo or owner keyring pair is undefined')
  }

  const chainIdDomain = { Domain: domainId }

  // Check current state
  const consensusAllowlist = await chainAllowlist(consensusApi)
  const domainInAllowlist = isChainInAllowlist(consensusAllowlist, chainIdDomain)

  // Step 1: SUDO update consensus chain allowlist (add domain)
  if (!domainInAllowlist) {
    console.log(`Step 1/3: Adding domain ${domainId} to consensus allowlist`)
    const allowAddDomain = { Add: chainIdDomain }
    const callUpdateAllowlist =
      consensusApi.tx.messenger.updateConsensusChainAllowlist(allowAddDomain)
    const sudoWrapped = consensusApi.tx.sudo.sudo(callUpdateAllowlist)
    await signAndSendTx(sudo.keyringPair, sudoWrapped, {}, [], false)
    // Wait 1 block for transaction to be processed
    await waitForBlocks(consensusApi, 1)
  } else {
    console.log(`Step 1/3: ✓ Domain ${domainId} already in allowlist`)
  }

  const domainAllowlist = await chainAllowlist(domainApi)
  const consensusInAllowlist = isChainInAllowlist(domainAllowlist, 'Consensus')

  // Step 2: Owner initiates domain allowlist update (add Consensus)
  if (!consensusInAllowlist) {
    console.log(`Step 2/3: Initiating domain ${domainId} allowlist update`)
    const allowAddConsensus = { Add: 'Consensus' }
    const callInitiateDomainUpdate = consensusApi.tx.messenger.initiateDomainUpdateChainAllowlist(
      domainId,
      allowAddConsensus,
    )
    await signAndSendTx(owner.keyringPair, callInitiateDomainUpdate, {}, [], false)
    // Wait 1 block for cross-chain message to be initiated
    await waitForBlocks(consensusApi, 1)
  } else {
    console.log('Step 2/3: ✓ Consensus already in allowlist')
  }

  // Step 3: Owner initiates channel (Consensus -> Domain)
  // Check if channel already exists by querying nextChannelId
  // Channels is a DoubleMap(ChainId, ChannelId) so we use NextChannelId StorageMap instead
  const nextId = await nextChannelId(consensusApi, { domainId })
  // If nextChannelId > 0, a channel exists (channel IDs start at 0)
  const channelExists = nextId > 0n

  if (!channelExists) {
    console.log(`Step 3/3: Initiating channel to domain ${domainId}`)
    const callInitiateChannel = consensusApi.tx.messenger.initiateChannel(chainIdDomain)
    await signAndSendTx(owner.keyringPair, callInitiateChannel, {}, [], false)

    // Wait for channel to be open (similar to official Subspace test pattern)
    console.log('Waiting for channel to open...')
    await waitUntil(async () => {
      const channel = await channels(consensusApi, { domainId }, 0n)
      return channel !== null && channel.state === 'Open'
    })
    console.log('✓ Channel opened successfully')
  } else {
    console.log(`Step 3/3: ✓ Channel to domain ${domainId} already exists`)
  }

  console.log('✅ XDM setup completed')
}
