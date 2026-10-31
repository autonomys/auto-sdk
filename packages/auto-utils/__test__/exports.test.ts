import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const packageDir = join(__dirname, '..')
const readJson = (path: string) => JSON.parse(readFileSync(join(packageDir, path), 'utf8'))
const packageJson = readJson('package.json')

const loadedPolkadotModules = (specifier: string): string[] =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        '-e',
        `require(${JSON.stringify(specifier)})
        console.log(JSON.stringify(Object.keys(require.cache).filter((path) => path.includes('@polkadot'))))`,
      ],
      { cwd: packageDir, encoding: 'utf8' },
    ),
  )

describe('Verify package exports', () => {
  const conditionalExports = Object.entries(packageJson.exports).filter(
    ([, target]) => typeof target === 'object',
  )

  test.each(conditionalExports)('Check %s points at built files', (subpath, target) => {
    for (const file of Object.values(target as Record<string, string>)) {
      expect(existsSync(join(packageDir, file))).toBe(true)
    }
    if (subpath !== '.') {
      expect(packageJson.typesVersions['*'][subpath.slice(2)]).toEqual([
        (target as Record<string, string>).types,
      ])
    }
  })

  test('Check the ES module build is marked as side-effect free', () => {
    expect(readJson('dist/esm/package.json')).toEqual({ type: 'module', sideEffects: false })
  })

  test('Check the root entry point loads Polkadot', () => {
    expect(loadedPolkadotModules('@autonomys/auto-utils').length).toBeGreaterThan(0)
  })

  test.each(['constants', 'network', 'number', 'string', 'types'])(
    'Check @autonomys/auto-utils/%s loads without Polkadot',
    (subpath) => {
      expect(loadedPolkadotModules(`@autonomys/auto-utils/${subpath}`)).toEqual([])
    },
  )
})
