import assert from 'node:assert/strict'
import { ai3ToShannons, formatUnits, parseUnits, shannonsToAi3 } from '../src/number'

describe('AI3/Shannon conversion', () => {
  test('round-trip exactness for sample cases', () => {
    const cases = [
      { shannon: '1', expected: '0.000000000000000001' },
      { shannon: '999', expected: '0.000000000000000999' },
      { shannon: '1000000000000000000', expected: '1' },
      { shannon: '1000000000000000001', expected: '1.000000000000000001' },
      { shannon: '1123456789012345678', expected: '1.123456789012345678' },
      { shannon: '9007199254740992000', expected: '9.007199254740992' },
    ]

    for (const { shannon, expected } of cases) {
      const formatted = shannonsToAi3(BigInt(shannon))
      assert.equal(formatted, expected)
      const back = ai3ToShannons(formatted)
      assert.equal(back.toString(), shannon)
    }
  })

  test('ai3ToShannons converts correctly', () => {
    assert.equal(ai3ToShannons('1.5').toString(), '1500000000000000000')
    assert.equal(ai3ToShannons('0.000000000000000001').toString(), '1')
    assert.equal(ai3ToShannons('0').toString(), '0')
  })

  test('shannonsToAi3 converts correctly', () => {
    assert.equal(shannonsToAi3(1500000000000000000n), '1.5')
    assert.equal(shannonsToAi3(1n), '0.000000000000000001')
    assert.equal(shannonsToAi3(0n), '0')
  })

  test('negative values supported', () => {
    const shannons = ai3ToShannons('-1.5')
    assert.equal(shannonsToAi3(shannons), '-1.5')
  })

  test('excess decimals errors by default', () => {
    assert.throws(() => ai3ToShannons('1.1234567890123456789'))
  })

  test('excess decimals truncate on option', () => {
    const shannons = ai3ToShannons('1.1234567890123456789', { rounding: 'truncate' })
    assert.equal(shannonsToAi3(shannons), '1.123456789012345678')
  })

  test('excess decimals round on option', () => {
    const shannons = ai3ToShannons('1.1234567890123456789', { rounding: 'round' })
    assert.equal(shannonsToAi3(shannons), '1.123456789012345679')
  })

  test('excess decimals ceil on option', () => {
    const shannons1 = ai3ToShannons('1.1234567890123456781', { rounding: 'ceil' })
    assert.equal(shannonsToAi3(shannons1), '1.123456789012345679')

    const shannons2 = ai3ToShannons('1.1234567890123456701', { rounding: 'ceil' })
    assert.equal(shannonsToAi3(shannons2), '1.123456789012345671')

    // Even tiny excess should round up
    const shannons3 = ai3ToShannons('1.0000000000000000001', { rounding: 'ceil' })
    assert.equal(shannonsToAi3(shannons3), '1.000000000000000001')
  })

  test('validates decimals parameter', () => {
    assert.throws(() => parseUnits('1.5', -1), /decimals must be a non-negative integer/)
    assert.throws(() => parseUnits('1.5', 1.5), /decimals must be a non-negative integer/)
    assert.throws(() => formatUnits(1500n, -1), /decimals must be a non-negative integer/)
    assert.throws(() => formatUnits(1500n, 1.5), /decimals must be a non-negative integer/)
  })
})

describe('Generic parseUnits/formatUnits', () => {
  test('works with custom decimals', () => {
    const v = parseUnits('1.123', 2, { rounding: 'truncate' })
    assert.equal(formatUnits(v, 2), '1.12')
  })

  test('works with custom decimals - round', () => {
    const v = parseUnits('1.125', 2, { rounding: 'round' })
    assert.equal(formatUnits(v, 2), '1.13')
  })

  test('works with custom decimals - ceil', () => {
    const v1 = parseUnits('1.121', 2, { rounding: 'ceil' })
    assert.equal(formatUnits(v1, 2), '1.13')

    const v2 = parseUnits('1.129', 2, { rounding: 'ceil' })
    assert.equal(formatUnits(v2, 2), '1.13')

    // Even tiny excess should ceil
    const v3 = parseUnits('1.101', 2, { rounding: 'ceil' })
    assert.equal(formatUnits(v3, 2), '1.11')
  })
})
