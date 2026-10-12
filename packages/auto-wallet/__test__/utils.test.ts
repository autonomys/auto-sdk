import { shortenAddress } from '../src/utils'

describe('shortenAddress', () => {
  const sampleAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'

  it('should return empty string when address is undefined', () => {
    expect(shortenAddress(undefined)).toBe('')
  })

  it('should return empty string when address is empty string', () => {
    expect(shortenAddress('')).toBe('')
  })

  it('should shorten address with default length of 4', () => {
    const shortened = shortenAddress(sampleAddress)
    // prefix is length + 2 = 6, suffix is 4: "5Grwva…utQY"
    expect(shortened).toBe('5Grwva\u2026utQY')
  })

  it('should shorten address with custom length', () => {
    const shortened = shortenAddress(sampleAddress, 6)
    // prefix is 6 + 2 = 8: "5GrwvaEF", suffix is 6: "GKutQY"
    expect(shortened).toBe('5GrwvaEF\u2026GKutQY')
  })

  it('should shorten address with length 1', () => {
    const shortened = shortenAddress(sampleAddress, 1)
    expect(shortened).toBe('5Gr\u2026Y')
  })
})
