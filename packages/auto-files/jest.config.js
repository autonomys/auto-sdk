/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // ESM, so the tests can load auto-dag-data (ESM only) the way getNode does, with a
  // dynamic import; in CommonJS mode ts-jest turns that import into a require, which fails
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    // The package compiles with module Node16; ts-jest warns about that unless
    // isolatedModules is on
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, diagnostics: { ignoreCodes: [151002] } }],
  },
}
