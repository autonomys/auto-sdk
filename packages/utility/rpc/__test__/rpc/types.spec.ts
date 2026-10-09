import path from 'path'
import ts from 'typescript'
import { version as otherZodVersion } from 'zod-3.25.55/package.json'
import { version as zodVersion } from 'zod/package.json'

// ts-jest doesn't type-check this package (isolatedModules), so the types are checked
// with the TypeScript compiler against the package tsconfig.
const typeCheck = (file: string) => {
  const configPath = path.join(__dirname, '../../tsconfig.json')
  const { config } = ts.readConfigFile(configPath, ts.sys.readFile)
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(configPath))
  const program = ts.createProgram([file], {
    ...options,
    noEmit: true,
    incremental: false,
    rootDir: undefined,
  })

  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('rpc/definition types', () => {
  it('should test against a zod version different from the one rpc uses', () => {
    // A zod copy with the same version is treated as the same package by TypeScript,
    // so it wouldn't reproduce #448
    expect(otherZodVersion).not.toBe(zodVersion)
  })

  it('should type-check definitions built with zod 3, zod 4, another zod copy and custom schemas', () => {
    expect(typeCheck(path.join(__dirname, 'fixtures/standardSchemaTypes.ts'))).toEqual([])
  }, 60000)
})
