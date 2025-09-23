import assert from 'node:assert/strict'
import { DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS } from '../src/constants/token'
import {
  ai3ToShannons,
  formatUnits,
  meetsExistentialDeposit,
  parseUnits,
  shannonsToAi3,
} from '../src/number'

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

describe('Existential Deposit validation', () => {
  test('returns false for amounts below existential deposit', () => {
    assert.equal(meetsExistentialDeposit('0'), false)
    assert.equal(meetsExistentialDeposit('0.0000005'), false)
    assert.equal(meetsExistentialDeposit('0.000000999999'), false)
  })

  test('returns true for amounts at existential deposit threshold', () => {
    assert.equal(meetsExistentialDeposit('0.000001'), true)
  })

  test('returns true for amounts above existential deposit', () => {
    assert.equal(meetsExistentialDeposit('0.000001000001'), true)
    assert.equal(meetsExistentialDeposit('0.000002'), true)
    assert.equal(meetsExistentialDeposit('0.001'), true)
    assert.equal(meetsExistentialDeposit('1'), true)
    assert.equal(meetsExistentialDeposit('100.5'), true)
  })

  test('handles high precision amounts correctly', () => {
    // Just below ED - should be false
    const justBelow = shannonsToAi3(DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS - BigInt(1))
    assert.equal(meetsExistentialDeposit(justBelow), false)

    // Just above ED - should be true
    const justAbove = shannonsToAi3(DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS + BigInt(1))
    assert.equal(meetsExistentialDeposit(justAbove), true)
  })

  test('works with edge case precision values', () => {
    // Test the exact ED value in different string formats
    assert.equal(meetsExistentialDeposit('0.000001000000000000'), true)
    assert.equal(meetsExistentialDeposit('0.000001'), true)

    // Test values that are exactly 1 Shannon below ED
    const oneShannonBelow = shannonsToAi3(BigInt('999999999999'))
    assert.equal(meetsExistentialDeposit(oneShannonBelow), false)
  })

  test('handles negative amounts', () => {
    assert.equal(meetsExistentialDeposit('-1'), false)
    assert.equal(meetsExistentialDeposit('-0.000001'), false)
  })

  test('throws error for invalid amount formats', () => {
    assert.throws(() => meetsExistentialDeposit('invalid'), /invalid numeric string/)
    assert.throws(() => meetsExistentialDeposit('1.23e-6'), /invalid numeric string/)
    assert.throws(() => meetsExistentialDeposit(''), /empty string/)
    assert.throws(() => meetsExistentialDeposit('1.23.45'), /invalid numeric string/)
  })

  test('handles amounts with excess decimal precision', () => {
    // Should throw by default for excess decimals (same as ai3ToShannons)
    assert.throws(() => meetsExistentialDeposit('0.0000010000000000000000001'))
  })

  test('consistency with ai3ToShannons and constant', () => {
    // Verify our function uses the same logic as direct comparison
    const testAmount = '0.000001'
    const shannons = ai3ToShannons(testAmount)
    const directComparison = shannons >= DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS
    assert.equal(meetsExistentialDeposit(testAmount), directComparison)

    // Test with various amounts
    const testCases = ['0', '0.0000005', '0.000001', '0.000002', '1', '100']
    for (const amount of testCases) {
      const shannons = ai3ToShannons(amount)
      const expected = shannons >= DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS
      assert.equal(meetsExistentialDeposit(amount), expected, `Failed for amount: ${amount}`)
    }
  })
})
