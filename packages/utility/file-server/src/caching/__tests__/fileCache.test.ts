import { stringify } from '@autonomys/auto-utils'
import fs from 'fs'
import Keyv from 'keyv'
import os from 'os'
import path from 'path'
import { Readable } from 'stream'
import { FileResponse } from '../../models.js'
import { createFileCache } from '../fileCache.js'

const CID = 'bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy'

const collect = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

const fileResponse = (content: string): FileResponse => ({
  data: Readable.from([Buffer.from(content)]),
  mimeType: 'text/plain',
  size: BigInt(content.length),
})

// Enough `..` segments to climb from anywhere under cacheDir to the filesystem root, so the
// key points at `target` if it is joined onto cacheDir unchecked.
const traversalKey = (target: string) => `node:${'../'.repeat(64)}${target.slice(1)}`

describe('createFileCache', () => {
  let rootDir: string
  let cacheDir: string
  let store: Keyv
  let cache: ReturnType<typeof createFileCache>

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-cache-test-'))
    cacheDir = path.join(rootDir, 'a', 'b', 'c', 'files')
    fs.mkdirSync(cacheDir, { recursive: true })
    store = new Keyv({ serialize: stringify })
    cache = createFileCache({ cacheDir, pathPartitions: 3, stores: [store] })
  })

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true })
  })

  it('stores, reads and removes an entry for a CID key under the partitioned path', async () => {
    const key = `file:${CID}`

    await cache.set(key, fileResponse('hello'))

    const expectedPath = path.join(cacheDir, 'zy', '52', '4s', `file:${CID.slice(0, -6)}`, key)
    expect(fs.readFileSync(expectedPath, 'utf8')).toBe('hello')
    expect(await cache.has(key)).toBe(true)

    const cached = await cache.get(key)
    expect(cached).not.toBeNull()
    expect(cached!.mimeType).toBe('text/plain')
    expect(cached!.size).toBe(5n)
    expect((await collect(cached!.data)).toString('utf8')).toBe('hello')

    await cache.remove(key)
    expect(fs.existsSync(expectedPath)).toBe(false)
    expect(await cache.has(key)).toBe(false)
    expect(await cache.get(key)).toBeNull()
  })

  describe('keys that resolve outside cacheDir', () => {
    let outsideFile: string

    beforeEach(() => {
      outsideFile = path.join(rootDir, 'outside.txt')
      fs.writeFileSync(outsideFile, 'outside')
      // With 3 partitions, `......` resolves to `<cacheDir>/../../../......` without any separator.
      fs.writeFileSync(path.join(rootDir, 'a', '......'), 'outside')
    })

    const existingTargets = () => [traversalKey(outsideFile), '......', '..', '.']

    it('has returns false whether or not the target exists', async () => {
      for (const key of existingTargets()) {
        expect(await cache.has(key)).toBe(false)
      }
      expect(await cache.has(traversalKey(path.join(rootDir, 'missing.txt')))).toBe(false)
    })

    it('get returns null without reading the target, even when the store has the key', async () => {
      for (const key of existingTargets()) {
        await store.set(key, { mimeType: 'text/plain', size: 7n })
        expect(await cache.get(key)).toBeNull()
      }
    })

    it('set rejects and writes nothing', async () => {
      const newOutsideFile = path.join(rootDir, 'new.txt')

      await expect(cache.set(traversalKey(newOutsideFile), fileResponse('x'))).rejects.toThrow(
        'Invalid file cache key',
      )
      await expect(cache.set(traversalKey(outsideFile), fileResponse('x'))).rejects.toThrow(
        'Invalid file cache key',
      )
      await expect(cache.set('......', fileResponse('x'))).rejects.toThrow('Invalid file cache key')

      expect(fs.existsSync(newOutsideFile)).toBe(false)
      expect(fs.readFileSync(outsideFile, 'utf8')).toBe('outside')
      expect(fs.readFileSync(path.join(rootDir, 'a', '......'), 'utf8')).toBe('outside')
      expect(await store.get(traversalKey(newOutsideFile))).toBeUndefined()
    })

    it('remove leaves the target in place, even when the store has the key', async () => {
      for (const key of [traversalKey(outsideFile), '......']) {
        await store.set(key, { mimeType: 'text/plain', size: 7n })
        await cache.remove(key)
      }

      expect(fs.readFileSync(outsideFile, 'utf8')).toBe('outside')
      expect(fs.readFileSync(path.join(rootDir, 'a', '......'), 'utf8')).toBe('outside')
    })
  })

  it('rejects keys containing path separators even when they stay inside cacheDir', async () => {
    const insideFile = path.join(cacheDir, 'files.sqlite')
    fs.writeFileSync(insideFile, 'db')

    const key = traversalKey(insideFile)
    expect(await cache.has(key)).toBe(false)
    await expect(cache.set(key, fileResponse('x'))).rejects.toThrow('Invalid file cache key')
    await expect(cache.set('node:a\\b', fileResponse('x'))).rejects.toThrow(
      'Invalid file cache key',
    )
    expect(fs.readFileSync(insideFile, 'utf8')).toBe('db')
  })
})
