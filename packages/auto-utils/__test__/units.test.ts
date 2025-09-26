import assert from 'node:assert/strict'
import { DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS } from '../src/constants/token'
import {
  ai3ToShannons,
  formatUnits,
  meetsExistentialDepositAi3,
  meetsExistentialDepositShannons,
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

describe('Existential Deposit validation (AI3)', () => {
  test('returns false for amounts below existential deposit', () => {
    assert.equal(meetsExistentialDepositAi3('0'), false)
    assert.equal(meetsExistentialDepositAi3('0.000005'), false)
    assert.equal(meetsExistentialDepositAi3('0.0000099999'), false)
  })

  test('returns true for amounts at existential deposit threshold', () => {
    assert.equal(meetsExistentialDepositAi3('0.00001'), true)
  })

  test('returns true for amounts above existential deposit', () => {
    assert.equal(meetsExistentialDepositAi3('0.00001000001'), true)
    assert.equal(meetsExistentialDepositAi3('0.00002'), true)
    assert.equal(meetsExistentialDepositAi3('0.001'), true)
    assert.equal(meetsExistentialDepositAi3('1'), true)
    assert.equal(meetsExistentialDepositAi3('100.5'), true)
  })

  test('handles high precision amounts correctly', () => {
    // Just below ED - should be false
    const justBelow = shannonsToAi3(DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS - BigInt(1))
    assert.equal(meetsExistentialDepositAi3(justBelow), false)

    // Just above ED - should be true
    const justAbove = shannonsToAi3(DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS + BigInt(1))
    assert.equal(meetsExistentialDepositAi3(justAbove), true)
  })

  test('works with edge case precision values', () => {
    // Test the exact ED value in different string formats
    assert.equal(meetsExistentialDepositAi3('0.00001000000000000'), true)
    assert.equal(meetsExistentialDepositAi3('0.00001'), true)

    // Test values that are exactly 1 Shannon below ED
    const oneShannonBelow = shannonsToAi3(BigInt('9999999999999'))
    assert.equal(meetsExistentialDepositAi3(oneShannonBelow), false)
  })

  test('handles negative amounts', () => {
    assert.equal(meetsExistentialDepositAi3('-1'), false)
    assert.equal(meetsExistentialDepositAi3('-0.00001'), false)
  })

  test('throws error for invalid amount formats', () => {
    assert.throws(() => meetsExistentialDepositAi3('invalid'), /invalid numeric string/)
    assert.throws(() => meetsExistentialDepositAi3('1.23e-6'), /invalid numeric string/)
    assert.throws(() => meetsExistentialDepositAi3(''), /empty string/)
    assert.throws(() => meetsExistentialDepositAi3('1.23.45'), /invalid numeric string/)
  })

  test('handles amounts with excess decimal precision', () => {
    // Should throw by default for excess decimals (same as ai3ToShannons)
    assert.throws(() => meetsExistentialDepositAi3('0.000010000000000000000001'))
  })

  test('consistency with ai3ToShannons and constant', () => {
    // Verify our function uses the same logic as direct comparison
    const testAmount = '0.00001'
    const shannons = ai3ToShannons(testAmount)
    const directComparison = shannons >= DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS
    assert.equal(meetsExistentialDepositAi3(testAmount), directComparison)

    // Test with various amounts
    const testCases = ['0', '0.000005', '0.00001', '0.00002', '1', '100']
    for (const amount of testCases) {
      const shannons = ai3ToShannons(amount)
      const expected = shannons >= DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS
      assert.equal(meetsExistentialDepositAi3(amount), expected, `Failed for amount: ${amount}`)
    }
  })
})

describe('Existential Deposit validation (Shannon units)', () => {
  test('returns false for Shannon amounts below existential deposit', () => {
    assert.equal(meetsExistentialDepositShannons(BigInt(0)), false)
    assert.equal(meetsExistentialDepositShannons(BigInt('5000000000000')), false)
    assert.equal(meetsExistentialDepositShannons(BigInt('9999999999999')), false)
  })

  test('returns true for Shannon amounts at existential deposit threshold', () => {
    assert.equal(meetsExistentialDepositShannons(BigInt('10000000000000')), true)
    assert.equal(meetsExistentialDepositShannons(DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS), true)
  })

  test('returns true for Shannon amounts above existential deposit', () => {
    assert.equal(meetsExistentialDepositShannons(BigInt('10000000000001')), true)
    assert.equal(meetsExistentialDepositShannons(BigInt('20000000000000')), true)
    assert.equal(meetsExistentialDepositShannons(BigInt('1000000000000000000')), true) // 1 AI3
  })

  test('handles edge case Shannon values correctly', () => {
    // Exactly 1 Shannon below ED
    const oneBelowED = DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS - BigInt(1)
    assert.equal(meetsExistentialDepositShannons(oneBelowED), false)

    // Exactly 1 Shannon above ED
    const oneAboveED = DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS + BigInt(1)
    assert.equal(meetsExistentialDepositShannons(oneAboveED), true)
  })

  test('handles negative Shannon amounts', () => {
    assert.equal(meetsExistentialDepositShannons(BigInt('-1')), false)
    assert.equal(meetsExistentialDepositShannons(BigInt('-10000000000000')), false)
    assert.equal(meetsExistentialDepositShannons(-DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS), false)
  })

  test('handles very large Shannon amounts', () => {
    const largeAmount = BigInt('1000000000000000000000000') // 1 million AI3
    assert.equal(meetsExistentialDepositShannons(largeAmount), true)
  })

  test('consistency with constant reference', () => {
    // Test various multiples of the ED constant
    const testMultipliers = [0, 0.5, 1, 2, 10, 100]
    for (const multiplier of testMultipliers) {
      const amount =
        (DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS * BigInt(Math.floor(multiplier * 100))) / BigInt(100)
      const expected = amount >= DEFAULT_EXISTENTIAL_DEPOSIT_SHANNONS
      assert.equal(
        meetsExistentialDepositShannons(amount),
        expected,
        `Failed for multiplier: ${multiplier}, amount: ${amount}`,
      )
    }
  })

  test('performance with string-based BigInt creation', () => {
    // Test that function works with BigInt created from strings (common pattern)
    assert.equal(meetsExistentialDepositShannons(BigInt('0')), false)
    assert.equal(meetsExistentialDepositShannons(BigInt('10000000000000')), true)
    assert.equal(meetsExistentialDepositShannons(BigInt('1000000000000000000')), true)
  })
})

describe('Cross-function consistency (AI3 vs Shannon)', () => {
  test('both functions return same result for equivalent amounts', () => {
    const testCases = [
      { ai3: '0', shannon: BigInt('0') },
      { ai3: '0.000005', shannon: BigInt('5000000000000') },
      { ai3: '0.00001', shannon: BigInt('10000000000000') },
      { ai3: '0.00002', shannon: BigInt('20000000000000') },
      { ai3: '1', shannon: BigInt('1000000000000000000') },
      { ai3: '100.5', shannon: BigInt('100500000000000000000') },
    ]

    for (const testCase of testCases) {
      const ai3Result = meetsExistentialDepositAi3(testCase.ai3)
      const shannonResult = meetsExistentialDepositShannons(testCase.shannon)
      assert.equal(
        ai3Result,
        shannonResult,
        `Mismatch for AI3: ${testCase.ai3}, Shannon: ${testCase.shannon}`,
      )
    }
  })

  test('AI3 function converts to same Shannon value', () => {
    const testAmounts = ['0.00001', '0.00002', '1', '100']
    for (const amount of testAmounts) {
      const convertedShannon = ai3ToShannons(amount)
      const ai3Result = meetsExistentialDepositAi3(amount)
      const shannonResult = meetsExistentialDepositShannons(convertedShannon)
      assert.equal(ai3Result, shannonResult, `Conversion mismatch for amount: ${amount}`)
    }
  })
})
