import { deleteMarkerVersionId, resolveDeleteMarkerResult } from '../deleteMarker.js'

describe('deleteMarkerVersionId', () => {
  it('formats delete marker version ID from date timestamp', () => {
    const date = new Date(1700000000000)
    expect(deleteMarkerVersionId(date)).toBe('dm-1700000000000')
  })
})

describe('resolveDeleteMarkerResult', () => {
  it('returns deleteMarker: true and formatted versionId when deletedAt is present', () => {
    const date = new Date(1710000000000)
    expect(resolveDeleteMarkerResult(date)).toEqual({
      deleteMarker: true,
      versionId: 'dm-1710000000000',
    })
  })

  it('returns deleteMarker: false and versionId: null when deletedAt is null', () => {
    expect(resolveDeleteMarkerResult(null)).toEqual({
      deleteMarker: false,
      versionId: null,
    })
  })

  it('returns deleteMarker: false and versionId: null when deletedAt is undefined', () => {
    expect(resolveDeleteMarkerResult(undefined)).toEqual({
      deleteMarker: false,
      versionId: null,
    })
  })
})
