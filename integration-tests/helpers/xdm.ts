import { setupWallet, signAndSendTx, type ApiPromise, type Codec } from '@autonomys/auto-utils'
import { chainAllowlist, nextChannelId } from '@autonomys/auto-xdm'

/**
 * Checks if a chain ID exists in the allowlist
 */
const isChainInAllowlist = (
  allowlist: Codec,
  chainId: { Domain: number } | 'Consensus',
): boolean => {
  if (!allowlist?.toJSON) return false

  const allowlistJson = allowlist.toJSON()
  if (!Array.isArray(allowlistJson)) return false

  return allowlistJson.some((entry: unknown) => {
    if (typeof chainId === 'string') {
      // Check if the entry has a 'consensus' property (case-insensitive)
      return (
        entry === chainId ||
        (typeof entry === 'object' &&
          entry !== null &&
          chainId.toLowerCase() in (entry as Record<string, unknown>))
      )
    }
    return (entry as { domain?: number })?.domain === chainId.Domain
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
  } else {
    console.log('Step 2/3: ✓ Consensus already in allowlist')
  }

  // Step 3: Owner initiates channel (Consensus -> Domain)
  // Check if channel already exists by querying nextChannelId
  // Channels is a DoubleMap(ChainId, ChannelId) so we use NextChannelId StorageMap instead
  const nextId = await nextChannelId(consensusApi, { domainId })
  // If nextChannelId > 0, a channel exists (channel IDs start at 1)
  const channelExists = nextId && !nextId.isEmpty && BigInt(nextId.toString()) > 0n

  if (!channelExists) {
    console.log(`Step 3/3: Initiating channel to domain ${domainId}`)
    const callInitiateChannel = consensusApi.tx.messenger.initiateChannel(chainIdDomain)
    await signAndSendTx(owner.keyringPair, callInitiateChannel, {}, [], false)
  } else {
    console.log(`Step 3/3: ✓ Channel to domain ${domainId} already exists`)
  }

  console.log('✅ XDM setup completed')
}
