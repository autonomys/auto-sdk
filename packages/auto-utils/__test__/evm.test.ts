import {
  AUTO_EVM_CHAIN_IDS,
  autoEvmChains,
  autoEvmChronos,
  autoEvmMainnet,
  autoEvmTaurus,
  NetworkId,
  networks,
} from '../src'

describe('Verify Auto EVM constants and chain configurations', () => {
  test('AUTO_EVM_CHAIN_IDS matches canonical chain IDs', () => {
    expect(AUTO_EVM_CHAIN_IDS[NetworkId.MAINNET]).toBe(870)
    expect(AUTO_EVM_CHAIN_IDS[NetworkId.CHRONOS]).toBe(8700)
    expect(AUTO_EVM_CHAIN_IDS[NetworkId.TAURUS]).toBe(490000)
    expect(AUTO_EVM_CHAIN_IDS[NetworkId.DEVNET]).toBe(1000)
    expect(AUTO_EVM_CHAIN_IDS[NetworkId.LOCALHOST]).toBe(8700)
  })

  test('autoEvmMainnet has valid chain configuration for wagmi / viem', () => {
    expect(autoEvmMainnet.id).toBe(870)
    expect(autoEvmMainnet.name).toBe('Auto EVM Mainnet')
    expect(autoEvmMainnet.nativeCurrency).toEqual({
      name: 'Auto Token',
      symbol: 'AI3',
      decimals: 18,
    })
    expect(autoEvmMainnet.rpcUrls.default.http).toContain(
      'https://auto-evm.mainnet.autonomys.xyz/ws',
    )
    expect(autoEvmMainnet.blockExplorers?.default.url).toBe(
      'https://explorer.auto-evm.mainnet.autonomys.xyz',
    )
    expect(autoEvmMainnet.testnet).toBeUndefined()
  })

  test('autoEvmChronos is configured as testnet', () => {
    expect(autoEvmChronos.id).toBe(8700)
    expect(autoEvmChronos.nativeCurrency.symbol).toBe('tAI3')
    expect(autoEvmChronos.testnet).toBe(true)
  })

  test('autoEvmTaurus is configured with blockscout explorer', () => {
    expect(autoEvmTaurus.id).toBe(490000)
    expect(autoEvmTaurus.blockExplorers?.default.url).toBe(
      'https://blockscout.taurus.autonomys.xyz',
    )
    expect(autoEvmTaurus.testnet).toBe(true)
  })

  test('autoEvmChains map contains definitions for all network IDs', () => {
    expect(autoEvmChains[NetworkId.MAINNET]).toBe(autoEvmMainnet)
    expect(autoEvmChains[NetworkId.CHRONOS]).toBe(autoEvmChronos)
    expect(autoEvmChains[NetworkId.TAURUS]).toBe(autoEvmTaurus)
  })

  test('networks list includes chainId in Auto-EVM domain objects', () => {
    const mainnet = networks.find((n) => n.id === NetworkId.MAINNET)
    const mainnetAutoEvm = mainnet?.domains.find((d) => d.name === 'Auto-EVM')
    expect(mainnetAutoEvm?.chainId).toBe(870)

    const chronos = networks.find((n) => n.id === NetworkId.CHRONOS)
    const chronosAutoEvm = chronos?.domains.find((d) => d.name === 'Auto-EVM')
    expect(chronosAutoEvm?.chainId).toBe(8700)

    const taurus = networks.find((n) => n.id === NetworkId.TAURUS)
    const taurusAutoEvm = taurus?.domains.find((d) => d.name === 'Auto-EVM')
    expect(taurusAutoEvm?.chainId).toBe(490000)
  })
})
