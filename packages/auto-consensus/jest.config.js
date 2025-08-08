/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          module: 'commonjs',
          esModuleInterop: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@autonomys/auto-consensus$': '<rootDir>/src/index.ts',
    '^@autonomys/auto-utils$': '<rootDir>/../auto-utils/src/index.ts',
    '^@autonomys/auto-utils/(.*)$': '<rootDir>/../auto-utils/src/$1',
  },
}