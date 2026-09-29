import {
  bucketVersioningBody,
  OBJECT_LOCK_RETENTION_YEARS,
  objectLegalHoldBody,
  objectLockConfigurationBody,
  objectRetentionBody,
} from '../objectLock.js'

describe('objectLock', () => {
  it('defines OBJECT_LOCK_RETENTION_YEARS as 100', () => {
    expect(OBJECT_LOCK_RETENTION_YEARS).toBe(100)
  })

  it('generates bucket versioning configuration body with Status Enabled', () => {
    expect(bucketVersioningBody()).toEqual({
      Status: 'Enabled',
    })
  })

  it('generates object lock configuration body with 100-year COMPLIANCE retention', () => {
    expect(objectLockConfigurationBody()).toEqual({
      ObjectLockEnabled: 'Enabled',
      Rule: {
        DefaultRetention: {
          Mode: 'COMPLIANCE',
          Years: 100,
        },
      },
    })
  })

  it('generates object retention body matching bucket retention window', () => {
    const writeTime = new Date('2026-01-15T12:00:00.000Z')
    const retention = objectRetentionBody(writeTime)

    expect(retention.Mode).toBe('COMPLIANCE')
    expect(retention.RetainUntilDate).toBe('2126-01-15T12:00:00.000Z')
  })

  it('generates object legal hold body with Status OFF', () => {
    expect(objectLegalHoldBody()).toEqual({
      Status: 'OFF',
    })
  })
})
