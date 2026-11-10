import db from 'mime-db'

// Builds the same extension-to-type map as mime-types 3, whose lookup cannot be
// bundled for the browser without a polyfill because it requires 'path'. The
// scoring below is mime-types' mimeScore.js (MIT), which picks a type when
// several share an extension; __test__/mimeType.test.ts checks the results match.

const FACET_SCORES: Record<string, number> = { 'prs.': 100, 'x-': 200, 'x.': 300, 'vnd.': 400 }
const SOURCE_SCORES: Record<string, number> = { nginx: 10, apache: 20, iana: 40 }
const TYPE_SCORES: Record<string, number> = { application: 1, font: 2, audio: 2, video: 3 }

const mimeScore = (mimeType: string, source: string = 'default') => {
  if (mimeType === 'application/octet-stream') {
    return 0
  }

  const [type, subtype] = mimeType.split('/')
  const facet = subtype.replace(/(\.|x-).*/, '$1')

  return (
    (FACET_SCORES[facet] || 900) +
    (SOURCE_SCORES[source] || 30) +
    (TYPE_SCORES[type] || 0) +
    (1 - mimeType.length / 100)
  )
}

const typesByExtension: Record<string, string> = Object.create(null)

for (const [type, { source, extensions = [] }] of Object.entries(db)) {
  for (const extension of extensions) {
    const current = typesByExtension[extension]
    if (!current || mimeScore(current, db[current].source) <= mimeScore(type, source)) {
      typesByExtension[extension] = type
    }
  }
}

/**
 * Returns the MIME type for a file name's extension, or undefined when it is not known.
 * Like mime-types, a bare extension such as "json" also matches.
 */
export const lookupMimeType = (fileName: string): string | undefined => {
  const baseName = `x.${fileName}`.split('/').pop()!
  const dot = baseName.lastIndexOf('.')

  return dot > 0 ? typesByExtension[baseName.slice(dot + 1).toLowerCase()] : undefined
}
