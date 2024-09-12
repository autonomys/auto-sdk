module.exports = {
  testRegex: 'tests/.*.spec.ts',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    // Map the .js extension to .ts in your imports if necessary
    '^../src/(.*)\\.js$': '<rootDir>/src/$1.ts',
  },
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true, // Ensure ts-jest treats the code as ES modules
    },
  },
}
