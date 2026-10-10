import {
  autoEvm,
  autoEvmChains,
  autoEvmChronos,
  autoEvmDevnet,
  autoEvmLocalhost,
  autoEvmMainnet,
  autoEvmTaurus,
  AutoEvmChainId,
  getAutoEvmChain,
  getNetworkDomainDetails,
  NetworkId,
} from '../src'

describe('Auto EVM Constants & Helpers', () => {
  describe('AutoEvmChainId', () => {
    it('defines expected chain IDs for all networks', () => {
      expect(AutoEvmChainId.MAINNET).toBe(870)
      expect(AutoEvmChainId.CHRONOS).toBe(8700)
      expect(AutoEvmChainId.TAURUS).toBe(490000)
      expect(AutoEvmChainId.DEVNET).toBe(490000)
      expect(AutoEvmChainId.LOCAL).toBe(31337)
    })
  })

  describe('autoEvmMainnet and autoEvm alias', () => {
    it('exposes correct mainnet EVM details', () => {
      expect(autoEvmMainnet.id).toBe(870)
      expect(autoEvmMainnet.name).toBe('Autonomys Auto EVM')
      expect(autoEvmMainnet.network).toBe('autonomys-mainnet')
      expect(autoEvmMainnet.nativeCurrency).toEqual({
        name: 'AI3',
        symbol: 'AI3',
        decimals: 18,
      })
      expect(autoEvmMainnet.rpcUrls.default.http).toContain(
        'https://auto-evm.mainnet.autonomys.xyz/ws',
      )
      expect(autoEvmMainnet.rpcUrls.default.webSocket).toContain(
        'wss://auto-evm.mainnet.autonomys.xyz/ws',
      )
      expect(autoEvmMainnet.blockExplorers?.default.name).toBe('Blockscout')
      expect(autoEvmMainnet.blockExplorers?.default.url).toBe(
        'https://explorer.auto-evm.mainnet.autonomys.xyz/',
      )
      expect(autoEvmMainnet.testnet).toBe(false)
    })

    it('aliases autoEvm to autoEvmMainnet', () => {
      expect(autoEvm).toBe(autoEvmMainnet)
    })
  })

  describe('Testnet and local EVM chain constants', () => {
    it('exposes correct chronos chain configuration', () => {
      expect(autoEvmChronos.id).toBe(8700)
      expect(autoEvmChronos.name).toBe('Autonomys Chronos Auto EVM')
      expect(autoEvmChronos.nativeCurrency.symbol).toBe('tAI3')
      expect(autoEvmChronos.rpcUrls.default.http).toContain(
        'https://auto-evm.chronos.autonomys.xyz/ws',
      )
      expect(autoEvmChronos.blockExplorers?.default.name).toBe('Blockscout')
      expect(autoEvmChronos.blockExplorers?.default.url).toBe(
        'https://explorer.auto-evm.chronos.autonomys.xyz/',
      )
      expect(autoEvmChronos.testnet).toBe(true)
    })

    it('exposes correct taurus chain configuration', () => {
      expect(autoEvmTaurus.id).toBe(490000)
      expect(autoEvmTaurus.name).toBe('Autonomys Taurus Auto EVM')
      expect(autoEvmTaurus.nativeCurrency.symbol).toBe('tAI3')
      expect(autoEvmTaurus.rpcUrls.default.http).toContain(
        'https://auto-evm.taurus.autonomys.xyz/ws',
      )
      expect(autoEvmTaurus.testnet).toBe(true)
    })

    it('exposes correct devnet chain configuration', () => {
      expect(autoEvmDevnet.id).toBe(490000)
      expect(autoEvmDevnet.name).toBe('Autonomys Devnet Auto EVM')
      expect(autoEvmDevnet.nativeCurrency.symbol).toBe('tAI3')
      expect(autoEvmDevnet.testnet).toBe(true)
    })

    it('exposes correct localhost chain configuration', () => {
      expect(autoEvmLocalhost.id).toBe(31337)
      expect(autoEvmLocalhost.name).toBe('Autonomys Local Auto EVM')
      expect(autoEvmLocalhost.rpcUrls.default.http).toContain('http://127.0.0.1:9945')
      expect(autoEvmLocalhost.testnet).toBe(true)
    })
  })

  describe('autoEvmChains map', () => {
    it('indexes all networks by NetworkId', () => {
      expect(autoEvmChains[NetworkId.MAINNET]).toBe(autoEvmMainnet)
      expect(autoEvmChains[NetworkId.CHRONOS]).toBe(autoEvmChronos)
      expect(autoEvmChains[NetworkId.TAURUS]).toBe(autoEvmTaurus)
      expect(autoEvmChains[NetworkId.DEVNET]).toBe(autoEvmDevnet)
      expect(autoEvmChains[NetworkId.LOCALHOST]).toBe(autoEvmLocalhost)
    })
  })

  describe('getAutoEvmChain', () => {
    it('defaults to mainnet when no networkId is provided', () => {
      expect(getAutoEvmChain()).toBe(autoEvmMainnet)
    })

    it('returns the requested chain by NetworkId', () => {
      expect(getAutoEvmChain(NetworkId.CHRONOS)).toBe(autoEvmChronos)
      expect(getAutoEvmChain('taurus')).toBe(autoEvmTaurus)
      expect(getAutoEvmChain('localhost')).toBe(autoEvmLocalhost)
    })

    it('throws error for unknown networkId', () => {
      expect(() => getAutoEvmChain('invalid-network')).toThrow(
        "Auto EVM chain for network 'invalid-network' not found",
      )
    })
  })

  describe('Network domain integration', () => {
    it('includes chainId in network domain details', () => {
      const mainnetDomain = getNetworkDomainDetails({ networkId: NetworkId.MAINNET, domainId: '0' })
      expect(mainnetDomain.chainId).toBe(870)

      const chronosDomain = getNetworkDomainDetails({ networkId: NetworkId.CHRONOS, domainId: '0' })
      expect(chronosDomain.chainId).toBe(8700)

      const taurusDomain = getNetworkDomainDetails({ networkId: NetworkId.TAURUS, domainId: '0' })
      expect(taurusDomain.chainId).toBe(490000)
    })
  })
})
