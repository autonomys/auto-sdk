import { stringify } from '@autonomys/auto-utils'
import { jest } from '@jest/globals'
import type { Request } from 'express'
import fs from 'fs'
import fsPromises from 'fs/promises'
import Keyv from 'keyv'
import os from 'os'
import path from 'path'
import { Readable } from 'stream'
import { getByteRange } from '../../http/headers.js'
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

  it('reads ranges from getByteRange whose offsets are too large to be exact', async () => {
    const key = `file:${CID}`
    const huge = '9'.repeat(30)
    const byteRange = (range: string) => getByteRange({ headers: { range } } as unknown as Request)
    await cache.set(key, fileResponse('hello'))

    const toEnd = await cache.get(key, { byteRange: byteRange(`bytes=1-${huge}`) })
    expect((await collect(toEnd!.data)).toString('utf8')).toBe('ello')

    const pastEnd = await cache.get(key, { byteRange: byteRange(`bytes=${huge}-`) })
    expect(await collect(pastEnd!.data)).toHaveLength(0)
  })

  it('cleans up temporary .tmp file when the input stream errors mid-write', async () => {
    const key = CID
    const expectedPath = path.join(cacheDir, 'zy', '52', '4s', CID.slice(0, -6), key)
    const expectedDir = path.dirname(expectedPath)

    let emitted = false
    const failingStream = new Readable({
      read() {
        if (!emitted) {
          emitted = true
          this.push(Buffer.from('partial-chunk'))
        } else {
          this.destroy(new Error('upstream stream aborted'))
        }
      },
    })

    await expect(
      cache.set(key, {
        data: failingStream,
        mimeType: 'text/plain',
        size: 100n,
      }),
    ).rejects.toThrow('upstream stream aborted')

    expect(fs.existsSync(expectedPath)).toBe(false)
    expect(await cache.has(key)).toBe(false)
    expect(await cache.get(key)).toBeNull()

    const remainingEntries = fs.existsSync(expectedDir) ? fs.readdirSync(expectedDir) : []
    expect(remainingEntries).toEqual([])
  })

  describe('remove', () => {
    const key = `file:${CID}`
    const filePath = () => path.join(cacheDir, 'zy', '52', '4s', `file:${CID.slice(0, -6)}`, key)

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('deletes the file exactly once', async () => {
      await cache.set(key, fileResponse('hello'))
      const rm = jest.spyOn(fsPromises, 'rm')

      await cache.remove(key)
      await new Promise((resolve) => setImmediate(resolve))

      expect(rm).toHaveBeenCalledTimes(1)
      expect(fs.existsSync(filePath())).toBe(false)
      expect(await cache.get(key)).toBeNull()
    })

    it('clears the entry when its file is already gone', async () => {
      await cache.set(key, fileResponse('hello'))
      fs.rmSync(filePath())

      await expect(cache.remove(key)).resolves.toBeUndefined()
      expect(await cache.get(key)).toBeNull()
    })
  })
})
