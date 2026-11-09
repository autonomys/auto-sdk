import mime from 'mime-types'
import { lookupMimeType } from '../src/utils/mimeType'

const mimeTypesLookup = (fileName: string) => mime.lookup(fileName) || undefined

describe('lookupMimeType', () => {
  it('matches mime-types for every known extension', () => {
    const fileNames = Object.values(mime.extensions)
      .flat()
      .flatMap((extension) => [`file.${extension}`, `FILE.${extension.toUpperCase()}`])

    expect(fileNames.map((name) => [name, lookupMimeType(name)])).toEqual(
      fileNames.map((name) => [name, mimeTypesLookup(name)]),
    )
  })

  it.each([
    'README',
    'json',
    '.json',
    'archive.tar.gz',
    'dir/a.txt',
    'dir.d/README',
    '.bashrc',
    'dir/.bashrc',
    'dir/.a.txt',
    'a.',
    'a..',
    '..',
    '',
    'file.unknownextension',
  ])('matches mime-types for %j', (fileName) => {
    expect(lookupMimeType(fileName)).toBe(mimeTypesLookup(fileName))
  })
})
