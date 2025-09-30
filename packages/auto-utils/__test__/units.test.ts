import assert from 'node:assert/strict'
import {
  DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS,
  DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS,
} from '../src/constants/token'
import {
  ai3ToShannons,
  formatUnits,
  meetsConsensusExistentialDepositAi3,
  meetsConsensusExistentialDepositShannons,
  meetsDomainExistentialDepositAi3,
  meetsDomainExistentialDepositShannons,
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

describe('Consensus Existential Deposit validation (AI3)', () => {
  test('returns false for amounts below consensus existential deposit', () => {
    assert.equal(meetsConsensusExistentialDepositAi3('0'), false)
    assert.equal(meetsConsensusExistentialDepositAi3('0.000005'), false)
    assert.equal(meetsConsensusExistentialDepositAi3('0.0000099999'), false)
  })

  test('returns true for amounts at consensus existential deposit threshold', () => {
    assert.equal(meetsConsensusExistentialDepositAi3('0.00001'), true)
  })

  test('returns true for amounts above consensus existential deposit', () => {
    assert.equal(meetsConsensusExistentialDepositAi3('0.00001000001'), true)
    assert.equal(meetsConsensusExistentialDepositAi3('0.00002'), true)
    assert.equal(meetsConsensusExistentialDepositAi3('0.001'), true)
    assert.equal(meetsConsensusExistentialDepositAi3('1'), true)
    assert.equal(meetsConsensusExistentialDepositAi3('100.5'), true)
  })

  test('handles high precision amounts correctly', () => {
    // Just below consensus ED - should be false
    const justBelow = shannonsToAi3(DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS - BigInt(1))
    assert.equal(meetsConsensusExistentialDepositAi3(justBelow), false)

    // Just above consensus ED - should be true
    const justAbove = shannonsToAi3(DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS + BigInt(1))
    assert.equal(meetsConsensusExistentialDepositAi3(justAbove), true)
  })

  test('handles negative amounts', () => {
    assert.equal(meetsConsensusExistentialDepositAi3('-1'), false)
    assert.equal(meetsConsensusExistentialDepositAi3('-0.00001'), false)
  })

  test('works with edge case precision values', () => {
    // Test the exact ED value in different string formats
    assert.equal(meetsConsensusExistentialDepositAi3('0.00001000000000000'), true)
    assert.equal(meetsConsensusExistentialDepositAi3('0.00001'), true)

    // Test values that are exactly 1 Shannon below ED
    const oneShannonBelow = shannonsToAi3(BigInt('9999999999999'))
    assert.equal(meetsConsensusExistentialDepositAi3(oneShannonBelow), false)
  })

  test('throws error for invalid amount formats', () => {
    assert.throws(() => meetsConsensusExistentialDepositAi3('invalid'), /invalid numeric string/)
    assert.throws(() => meetsConsensusExistentialDepositAi3('1.23e-6'), /invalid numeric string/)
    assert.throws(() => meetsConsensusExistentialDepositAi3(''), /empty string/)
    assert.throws(() => meetsConsensusExistentialDepositAi3('1.23.45'), /invalid numeric string/)
  })

  test('handles amounts with excess decimal precision', () => {
    // Should throw by default for excess decimals (same as ai3ToShannons)
    assert.throws(() => meetsConsensusExistentialDepositAi3('0.000010000000000000000001'))
  })

  test('consistency with ai3ToShannons and constant', () => {
    // Verify our function uses the same logic as direct comparison
    const testAmount = '0.00001'
    const shannons = ai3ToShannons(testAmount)
    const directComparison = shannons >= DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS
    assert.equal(meetsConsensusExistentialDepositAi3(testAmount), directComparison)

    // Test with various amounts
    const testCases = ['0', '0.000005', '0.00001', '0.00002', '1', '100']
    for (const amount of testCases) {
      const shannons = ai3ToShannons(amount)
      const expected = shannons >= DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS
      assert.equal(
        meetsConsensusExistentialDepositAi3(amount),
        expected,
        `Failed for amount: ${amount}`,
      )
    }
  })
})

describe('Consensus Existential Deposit validation (Shannon units)', () => {
  test('returns false for Shannon amounts below consensus existential deposit', () => {
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt(0)), false)
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('5000000000000')), false)
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('9999999999999')), false)
  })

  test('returns true for Shannon amounts at consensus existential deposit threshold', () => {
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('10000000000000')), true)
    assert.equal(
      meetsConsensusExistentialDepositShannons(DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS),
      true,
    )
  })

  test('returns true for Shannon amounts above consensus existential deposit', () => {
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('10000000000001')), true)
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('20000000000000')), true)
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('1000000000000000000')), true) // 1 AI3
  })

  test('handles edge case Shannon values correctly', () => {
    // Exactly 1 Shannon below ED
    const oneBelowED = DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS - BigInt(1)
    assert.equal(meetsConsensusExistentialDepositShannons(oneBelowED), false)

    // Exactly 1 Shannon above ED
    const oneAboveED = DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS + BigInt(1)
    assert.equal(meetsConsensusExistentialDepositShannons(oneAboveED), true)
  })

  test('handles negative Shannon amounts', () => {
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('-1')), false)
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('-10000000000000')), false)
    assert.equal(
      meetsConsensusExistentialDepositShannons(-DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS),
      false,
    )
  })

  test('handles very large Shannon amounts', () => {
    const largeAmount = BigInt('1000000000000000000000000') // 1 million AI3
    assert.equal(meetsConsensusExistentialDepositShannons(largeAmount), true)
  })

  test('consistency with constant reference', () => {
    // Test various multiples of the ED constant
    const testMultipliers = [0, 0.5, 1, 2, 10, 100]
    for (const multiplier of testMultipliers) {
      const amount =
        (DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS * BigInt(Math.floor(multiplier * 100))) /
        BigInt(100)
      const expected = amount >= DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS
      assert.equal(
        meetsConsensusExistentialDepositShannons(amount),
        expected,
        `Failed for multiplier: ${multiplier}, amount: ${amount}`,
      )
    }
  })

  test('performance with string-based BigInt creation', () => {
    // Test that function works with BigInt created from strings (common pattern)
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('0')), false)
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('10000000000000')), true)
    assert.equal(meetsConsensusExistentialDepositShannons(BigInt('1000000000000000000')), true)
  })
})

describe('Domain Existential Deposit validation (AI3)', () => {
  test('returns false for amounts below domain existential deposit', () => {
    assert.equal(meetsDomainExistentialDepositAi3('0'), false)
    assert.equal(meetsDomainExistentialDepositAi3('0.0000005'), false)
    assert.equal(meetsDomainExistentialDepositAi3('0.000000999999'), false)
  })

  test('returns true for amounts at domain existential deposit threshold', () => {
    assert.equal(meetsDomainExistentialDepositAi3('0.000001'), true)
  })

  test('returns true for amounts above domain existential deposit', () => {
    assert.equal(meetsDomainExistentialDepositAi3('0.000001000001'), true)
    assert.equal(meetsDomainExistentialDepositAi3('0.000002'), true)
    assert.equal(meetsDomainExistentialDepositAi3('0.001'), true)
    assert.equal(meetsDomainExistentialDepositAi3('1'), true)
    assert.equal(meetsDomainExistentialDepositAi3('100.5'), true)
  })

  test('handles high precision amounts correctly', () => {
    // Just below domain ED - should be false
    const justBelow = shannonsToAi3(DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS - BigInt(1))
    assert.equal(meetsDomainExistentialDepositAi3(justBelow), false)

    // Just above domain ED - should be true
    const justAbove = shannonsToAi3(DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS + BigInt(1))
    assert.equal(meetsDomainExistentialDepositAi3(justAbove), true)
  })

  test('handles negative amounts', () => {
    assert.equal(meetsDomainExistentialDepositAi3('-1'), false)
    assert.equal(meetsDomainExistentialDepositAi3('-0.000001'), false)
  })

  test('works with edge case precision values', () => {
    // Test the exact ED value in different string formats
    assert.equal(meetsDomainExistentialDepositAi3('0.000001000000000000'), true)
    assert.equal(meetsDomainExistentialDepositAi3('0.000001'), true)

    // Test values that are exactly 1 Shannon below ED
    const oneShannonBelow = shannonsToAi3(BigInt('999999999999'))
    assert.equal(meetsDomainExistentialDepositAi3(oneShannonBelow), false)
  })

  test('throws error for invalid amount formats', () => {
    assert.throws(() => meetsDomainExistentialDepositAi3('invalid'), /invalid numeric string/)
    assert.throws(() => meetsDomainExistentialDepositAi3('1.23e-6'), /invalid numeric string/)
    assert.throws(() => meetsDomainExistentialDepositAi3(''), /empty string/)
    assert.throws(() => meetsDomainExistentialDepositAi3('1.23.45'), /invalid numeric string/)
  })

  test('handles amounts with excess decimal precision', () => {
    // Should throw by default for excess decimals (same as ai3ToShannons)
    assert.throws(() => meetsDomainExistentialDepositAi3('0.000001000000000000000001'))
  })

  test('consistency with ai3ToShannons and constant', () => {
    // Verify our function uses the same logic as direct comparison
    const testAmount = '0.000001'
    const shannons = ai3ToShannons(testAmount)
    const directComparison = shannons >= DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS
    assert.equal(meetsDomainExistentialDepositAi3(testAmount), directComparison)

    // Test with various amounts
    const testCases = ['0', '0.0000005', '0.000001', '0.000002', '1', '100']
    for (const amount of testCases) {
      const shannons = ai3ToShannons(amount)
      const expected = shannons >= DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS
      assert.equal(
        meetsDomainExistentialDepositAi3(amount),
        expected,
        `Failed for amount: ${amount}`,
      )
    }
  })
})

describe('Domain Existential Deposit validation (Shannon units)', () => {
  test('returns false for Shannon amounts below domain existential deposit', () => {
    assert.equal(meetsDomainExistentialDepositShannons(BigInt(0)), false)
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('500000000000')), false)
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('999999999999')), false)
  })

  test('returns true for Shannon amounts at domain existential deposit threshold', () => {
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('1000000000000')), true)
    assert.equal(
      meetsDomainExistentialDepositShannons(DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS),
      true,
    )
  })

  test('returns true for Shannon amounts above domain existential deposit', () => {
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('1000000000001')), true)
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('2000000000000')), true)
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('1000000000000000000')), true) // 1 AI3
  })

  test('handles edge case Shannon values correctly', () => {
    // Exactly 1 Shannon below ED
    const oneBelowED = DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS - BigInt(1)
    assert.equal(meetsDomainExistentialDepositShannons(oneBelowED), false)

    // Exactly 1 Shannon above ED
    const oneAboveED = DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS + BigInt(1)
    assert.equal(meetsDomainExistentialDepositShannons(oneAboveED), true)
  })

  test('handles negative Shannon amounts', () => {
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('-1')), false)
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('-1000000000000')), false)
    assert.equal(
      meetsDomainExistentialDepositShannons(-DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS),
      false,
    )
  })

  test('handles very large Shannon amounts', () => {
    const largeAmount = BigInt('1000000000000000000000000') // 1 million AI3
    assert.equal(meetsDomainExistentialDepositShannons(largeAmount), true)
  })

  test('consistency with constant reference', () => {
    // Test various multiples of the ED constant
    const testMultipliers = [0, 0.5, 1, 2, 10, 100]
    for (const multiplier of testMultipliers) {
      const amount =
        (DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS * BigInt(Math.floor(multiplier * 100))) /
        BigInt(100)
      const expected = amount >= DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS
      assert.equal(
        meetsDomainExistentialDepositShannons(amount),
        expected,
        `Failed for multiplier: ${multiplier}, amount: ${amount}`,
      )
    }
  })

  test('performance with string-based BigInt creation', () => {
    // Test that function works with BigInt created from strings (common pattern)
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('0')), false)
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('1000000000000')), true)
    assert.equal(meetsDomainExistentialDepositShannons(BigInt('1000000000000000000')), true)
  })
})

describe('Consensus vs Domain ED comparison', () => {
  test('consensus ED is higher than domain ED', () => {
    assert.equal(
      DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS > DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS,
      true,
    )
    assert.equal(DEFAULT_CONSENSUS_EXISTENTIAL_DEPOSIT_SHANNONS, BigInt('10000000000000'))
    assert.equal(DEFAULT_DOMAIN_EXISTENTIAL_DEPOSIT_SHANNONS, BigInt('1000000000000'))
  })

  test('amount that meets domain ED may not meet consensus ED', () => {
    // Amount that meets domain but not consensus
    const domainOnlyAmount = '0.000005' // Between 0.000001 and 0.00001
    assert.equal(meetsDomainExistentialDepositAi3(domainOnlyAmount), true)
    assert.equal(meetsConsensusExistentialDepositAi3(domainOnlyAmount), false)
  })

  test('amount that meets consensus ED always meets domain ED', () => {
    const consensusAmount = '0.00001'
    assert.equal(meetsConsensusExistentialDepositAi3(consensusAmount), true)
    assert.equal(meetsDomainExistentialDepositAi3(consensusAmount), true)
  })
})

describe('Cross-function consistency tests', () => {
  test('consensus AI3 and Shannon functions return same result for equivalent amounts', () => {
    const testCases = [
      { ai3: '0', shannon: BigInt('0') },
      { ai3: '0.000005', shannon: BigInt('5000000000000') },
      { ai3: '0.00001', shannon: BigInt('10000000000000') },
      { ai3: '0.00002', shannon: BigInt('20000000000000') },
      { ai3: '1', shannon: BigInt('1000000000000000000') },
      { ai3: '100.5', shannon: BigInt('100500000000000000000') },
    ]

    for (const testCase of testCases) {
      const ai3Result = meetsConsensusExistentialDepositAi3(testCase.ai3)
      const shannonResult = meetsConsensusExistentialDepositShannons(testCase.shannon)
      assert.equal(
        ai3Result,
        shannonResult,
        `Consensus mismatch for AI3: ${testCase.ai3}, Shannon: ${testCase.shannon}`,
      )
    }
  })

  test('domain AI3 and Shannon functions return same result for equivalent amounts', () => {
    const testCases = [
      { ai3: '0', shannon: BigInt('0') },
      { ai3: '0.0000005', shannon: BigInt('500000000000') },
      { ai3: '0.000001', shannon: BigInt('1000000000000') },
      { ai3: '0.000002', shannon: BigInt('2000000000000') },
      { ai3: '1', shannon: BigInt('1000000000000000000') },
      { ai3: '100.5', shannon: BigInt('100500000000000000000') },
    ]

    for (const testCase of testCases) {
      const ai3Result = meetsDomainExistentialDepositAi3(testCase.ai3)
      const shannonResult = meetsDomainExistentialDepositShannons(testCase.shannon)
      assert.equal(
        ai3Result,
        shannonResult,
        `Domain mismatch for AI3: ${testCase.ai3}, Shannon: ${testCase.shannon}`,
      )
    }
  })

  test('AI3 functions convert to same Shannon value', () => {
    const testAmounts = ['0.00001', '0.00002', '1', '100']
    for (const amount of testAmounts) {
      const convertedShannon = ai3ToShannons(amount)
      const consensusResult = meetsConsensusExistentialDepositAi3(amount)
      const consensusShannonResult = meetsConsensusExistentialDepositShannons(convertedShannon)
      assert.equal(
        consensusResult,
        consensusShannonResult,
        `Consensus conversion mismatch for amount: ${amount}`,
      )

      const domainResult = meetsDomainExistentialDepositAi3(amount)
      const domainShannonResult = meetsDomainExistentialDepositShannons(convertedShannon)
      assert.equal(
        domainResult,
        domainShannonResult,
        `Domain conversion mismatch for amount: ${amount}`,
      )
    }
  })
})
