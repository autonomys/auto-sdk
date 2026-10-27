/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    // The package compiles with module Node16; ts-jest warns about that unless
    // isolatedModules is on, but emits CommonJS for these tests either way.
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }],
  },
}
