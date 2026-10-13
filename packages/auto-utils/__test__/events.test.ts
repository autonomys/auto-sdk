import { detectTxSuccess, validateEvents } from '../src/utils'
import type { EventRecord } from '../src/types/event'

const mockEventRecord = (section: string, method: string): EventRecord =>
  ({
    phase: {},
    event: {
      section,
      method,
      data: [],
      typeDef: [],
    },
    topics: [],
  }) as unknown as EventRecord

describe('Event utilities in auto-utils', () => {

  describe('detectTxSuccess', () => {
    it('returns true when system.ExtrinsicSuccess is present in events', () => {
      const events: EventRecord[] = [
        mockEventRecord('balances', 'Transfer'),
        mockEventRecord('system', 'ExtrinsicSuccess'),
      ]
      expect(detectTxSuccess(events)).toBe(true)
    })

    it('returns false when system.ExtrinsicSuccess is not present', () => {
      const events: EventRecord[] = [
        mockEventRecord('balances', 'Transfer'),
        mockEventRecord('system', 'ExtrinsicFailed'),
      ]
      expect(detectTxSuccess(events)).toBe(false)
    })

    it('returns false for empty events array', () => {
      expect(detectTxSuccess([])).toBe(false)
    })
  })

  describe('validateEvents', () => {
    const txHash = '0x1234'
    const blockHash = '0x5678'

    it('validates events against default expected success event', () => {
      const events: EventRecord[] = [mockEventRecord('system', 'ExtrinsicSuccess')]
      const result = validateEvents(events, undefined, txHash, blockHash)

      expect(result.expected).toEqual([])
      expect(result.found).toEqual(['system.ExtrinsicSuccess'])
    })

    it('validates single string expected event', () => {
      const events: EventRecord[] = [mockEventRecord('balances', 'Transfer')]
      const result = validateEvents(events, 'balances.Transfer', txHash, blockHash)

      expect(result.expected).toEqual([])
      expect(result.found).toEqual(['balances.Transfer'])
    })

    it('identifies missing expected events', () => {
      const events: EventRecord[] = [mockEventRecord('balances', 'Transfer')]
      const result = validateEvents(
        events,
        ['balances.Transfer', 'system.ExtrinsicSuccess'],
        txHash,
        blockHash,
      )

      expect(result.expected).toEqual(['system.ExtrinsicSuccess'])
      expect(result.found).toEqual(['balances.Transfer'])
    })

    it('flattens nested arrays of expected events', () => {
      const events: EventRecord[] = [
        mockEventRecord('system', 'ExtrinsicSuccess'),
        mockEventRecord('domains', 'OperatorNominated'),
      ]
      const result = validateEvents(
        events,
        ['system.ExtrinsicSuccess', ['domains.OperatorNominated', 'domains.StakeAdded']],
        txHash,
        blockHash,
      )

      expect(result.expected).toEqual(['domains.StakeAdded'])
      expect(result.found).toEqual(['system.ExtrinsicSuccess', 'domains.OperatorNominated'])
    })

    it('handles unexpected events without throwing when log is enabled', () => {
      const events: EventRecord[] = [
        mockEventRecord('system', 'ExtrinsicSuccess'),
        mockEventRecord('custom', 'ExtraEvent'),
      ]
      const result = validateEvents(events, ['system.ExtrinsicSuccess'], txHash, blockHash, true)

      expect(result.expected).toEqual([])
      expect(result.found).toEqual(['system.ExtrinsicSuccess'])
    })
  })
})
