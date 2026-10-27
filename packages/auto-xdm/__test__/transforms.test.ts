import { TypeRegistry } from '@polkadot/types'
import { codecToChannel } from '../src/transforms'

describe('codecToChannel', () => {
  const registry = new TypeRegistry()
  registry.register({
    ChannelState: {
      _enum: ['Initiated', 'Open', 'Closed'],
    },
    Channel: {
      channelId: 'U256',
      state: 'ChannelState',
      nextInboxNonce: 'U256',
      nextOutboxNonce: 'U256',
      latestResponseReceivedMessageNonce: 'Option<U256>',
      maxOutgoingMessages: 'u32',
      maybeOwner: 'Option<AccountId32>',
      channelReserveFee: 'Balance',
    },
  })

  it('should transform a Channel codec built with TypeRegistry into decimal strings', () => {
    const channelCodec = registry.createType('Channel', {
      channelId: 1,
      state: 'Open',
      nextInboxNonce: 219,
      nextOutboxNonce: 300,
      latestResponseReceivedMessageNonce: 218,
      maxOutgoingMessages: 1000,
      maybeOwner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      channelReserveFee: '1000000000000',
    })

    const result = codecToChannel(channelCodec)

    expect(result).toEqual({
      channelId: '1',
      state: 'Open',
      nextInboxNonce: '219',
      nextOutboxNonce: '300',
      latestResponseReceivedMessageNonce: '218',
      maxOutgoingMessages: 1000,
      maybeOwner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      channelReserveFee: '1000000000000',
    })
  })

  it('should transform a Channel codec with None optional fields', () => {
    const channelCodec = registry.createType('Channel', {
      channelId: 0,
      state: 'Initiated',
      nextInboxNonce: 0,
      nextOutboxNonce: 0,
      latestResponseReceivedMessageNonce: null,
      maxOutgoingMessages: 100,
      maybeOwner: null,
      channelReserveFee: 0,
    })

    const result = codecToChannel(channelCodec)

    expect(result).toEqual({
      channelId: '0',
      state: 'Initiated',
      nextInboxNonce: '0',
      nextOutboxNonce: '0',
      latestResponseReceivedMessageNonce: null,
      maxOutgoingMessages: 100,
      maybeOwner: null,
      channelReserveFee: '0',
    })
  })

  it('should return null for empty codec or invalid inputs', () => {
    expect(codecToChannel(null)).toBeNull()
    expect(codecToChannel(undefined)).toBeNull()
    expect(codecToChannel({ isEmpty: true })).toBeNull()
  })
})
