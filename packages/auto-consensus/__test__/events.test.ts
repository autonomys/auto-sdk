import {
  Type,
  eventName,
  eventsGroup,
  expectSuccessfulTxEvent,
  events,
} from '../src/utils/events'

describe('Events utilities in auto-consensus', () => {
  describe('eventName and Type enum', () => {
    it('creates formatted event strings with type prefix', () => {
      expect(eventName(Type.system, 'ExtrinsicSuccess')).toBe('system.ExtrinsicSuccess')
      expect(eventName(Type.balances, 'Transfer')).toBe('balances.Transfer')
      expect(eventName(Type.domains, 'OperatorNominated')).toBe('domains.OperatorNominated')
      expect(eventName(Type.transactionPayment, 'TransactionFeePaid')).toBe(
        'transactionPayment.TransactionFeePaid',
      )
      expect(eventName(Type.sudo, 'Sudid')).toBe('sudo.Sudid')
    })
  })

  describe('eventsGroup', () => {
    it('contains valid system events', () => {
      expect(eventsGroup.system.success).toBe('system.ExtrinsicSuccess')
      expect(eventsGroup.system.failure).toBe('system.ExtrinsicFailed')
      expect(eventsGroup.system.newAccount).toBe('system.NewAccount')
    })

    it('contains valid balances events', () => {
      expect(eventsGroup.balances.transfer).toBe('balances.Transfer')
      expect(eventsGroup.balances.deposit).toBe('balances.Deposit')
      expect(eventsGroup.balances.withdraw).toBe('balances.Withdraw')
      expect(eventsGroup.balances.endowed).toBe('balances.Endowed')
    })

    it('contains valid domains events', () => {
      expect(eventsGroup.domains.operatorRegistered).toBe('domains.OperatorRegistered')
      expect(eventsGroup.domains.operatorNominated).toBe('domains.OperatorNominated')
      expect(eventsGroup.domains.operatorDeregistered).toBe('domains.OperatorDeregistered')
      expect(eventsGroup.domains.fundsUnlocked).toBe('domains.FundsUnlocked')
      expect(eventsGroup.domains.storageFeeDeposited).toBe('domains.StorageFeeDeposited')
      expect(eventsGroup.domains.withdrawStake).toBe('domains.WithdrewStake')
    })

    it('defines default successful transaction events', () => {
      expect(expectSuccessfulTxEvent).toEqual(['system.ExtrinsicSuccess'])
    })
  })

  describe('action events mappings', () => {
    it('includes required events for balance transfer', () => {
      expect(events.transfer).toContain('balances.Transfer')
      expect(events.transfer).toContain('balances.Withdraw')
      expect(events.transfer).toContain('transactionPayment.TransactionFeePaid')
      expect(events.transfer).toContain('system.ExtrinsicSuccess')
    })

    it('includes required events for operator registration and nomination', () => {
      expect(events.operatorRegistered).toContain('domains.OperatorRegistered')
      expect(events.operatorRegistered).toContain('domains.StorageFeeDeposited')
      expect(events.operatorNominated).toContain('domains.OperatorNominated')
      expect(events.operatorNominated).toContain('domains.StorageFeeDeposited')
    })

    it('includes required events for stake withdrawal and unlocking funds', () => {
      expect(events.withdrawStake).toContain('domains.WithdrewStake')
      expect(events.unlockFunds).toContain('domains.FundsUnlocked')
    })
  })
})
