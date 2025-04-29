/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Map imports ending in .js to the corresponding .ts file within src
    '^(\.{1,2}/.*)\.js$': '$1',
  },
}
