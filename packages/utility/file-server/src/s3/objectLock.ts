// ── Versioning + Object Lock (honest WORM) ─────────────────────────────────
// Auto Drive stores content on the Autonomys DSN, where a version can never be
// destroyed. That is exactly S3's versioned-WORM model: versioning is always on,
// every write stacks a new version (versionId = CID), DeleteObject writes a
// delete marker (the key is hidden but nothing is destroyed), and destroying a
// specific version (DeleteObject?versionId) is refused. Storage is permanent:
// data on the DSN is never destroyed. S3's bucket DefaultRetention must be a
// finite DURATION (Days/Years), not "forever", so we advertise a COMPLIANCE-mode
// Object Lock with a 100-year window — the conventional S3 maximum, our stand-in
// for "permanent".

// The COMPLIANCE retention window. BOTH the bucket-level DefaultRetention (a
// duration, in Years) and each object's RetainUntilDate (a date = write time +
// this many years) derive from this one value, so the two can never disagree.
export const OBJECT_LOCK_RETENTION_YEARS = 100

export const bucketVersioningBody = () => ({ Status: 'Enabled' as const })

export const objectLockConfigurationBody = () => ({
  ObjectLockEnabled: 'Enabled' as const,
  Rule: {
    DefaultRetention: { Mode: 'COMPLIANCE' as const, Years: OBJECT_LOCK_RETENTION_YEARS },
  },
})

// Per-object retention: COMPLIANCE until the object's write time + the default
// window — exactly what the bucket's Years default yields, so the bucket rule
// and the per-object date always agree.
export const objectRetentionBody = (writeTime: Date) => {
  const retainUntil = new Date(writeTime)
  retainUntil.setUTCFullYear(retainUntil.getUTCFullYear() + OBJECT_LOCK_RETENTION_YEARS)
  return {
    Mode: 'COMPLIANCE' as const,
    RetainUntilDate: retainUntil.toISOString(),
  }
}

/** No per-object legal hold concept (distinct from the intrinsic retention). */
export const objectLegalHoldBody = () => ({ Status: 'OFF' as const })