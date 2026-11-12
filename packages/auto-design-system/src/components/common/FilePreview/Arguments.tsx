import React, { FC, useEffect, useState } from 'react'
import ReactJsonImport from 'react-json-view'
import { NoPreviewAvailable } from './NoPreviewAvailable'
import { TextViewer } from './TextViewer'

// react-json-view is CommonJS with the component on `.default`. Consumers load this package's
// ESM build as strict ESM ("type": "module") and Rollup's CJS build requires it as is, so in
// both cases the default import is the module object rather than the component.
const ReactJson =
  (ReactJsonImport as unknown as { default?: typeof ReactJsonImport }).default ?? ReactJsonImport

type Props = {
  file: Blob
  collapseAtEntry?: number
}

const theme = {
  base00: 'transparent',
  base01: 'transparent',
  base02: 'transparent',
  base03: 'inherit',
  base04: '#ddd',
  base05: 'inherit',
  base06: 'inherit',
  base07: 'inherit',
  base08: 'inherit',
  base09: 'inherit',
  base0A: 'inherit',
  base0B: 'inherit',
  base0C: 'inherit',
  base0D: 'inherit',
  base0E: 'inherit',
  base0F: 'inherit',
}

type Preview =
  | { kind: 'json'; value: object }
  | { kind: 'text'; text: string; isValidJson: boolean }
  | { kind: 'unreadable' }

const isJsonContainer = (value: unknown): value is object =>
  typeof value === 'object' && value !== null

const parsePreview = (text: string): Preview => {
  try {
    const value: unknown = JSON.parse(text)
    return isJsonContainer(value)
      ? { kind: 'json', value }
      : { kind: 'text', text, isValidJson: true }
  } catch {
    return { kind: 'text', text, isValidJson: false }
  }
}

export const Arguments: FC<Props> = ({ file, collapseAtEntry = 5 }) => {
  const [preview, setPreview] = useState<Preview>()

  useEffect(() => {
    let isCurrent = true
    setPreview(undefined)

    file
      .text()
      .then(parsePreview)
      .catch((error): Preview => {
        console.error('Error reading JSON preview file:', error)
        return { kind: 'unreadable' }
      })
      .then((loaded) => {
        if (isCurrent) setPreview(loaded)
      })

    return () => {
      isCurrent = false
    }
  }, [file])

  if (!preview) return null

  if (preview.kind === 'unreadable') return <NoPreviewAvailable />

  if (preview.kind === 'text') {
    return (
      <div data-testid='testJsonRawDisplay' className='w-full'>
        {!preview.isValidJson && (
          <div className='mb-2 text-sm text-gray-500 dark:text-gray-400'>
            This file is not valid JSON. Showing its raw contents.
          </div>
        )}
        <TextViewer content={preview.text} extension='txt' />
      </div>
    )
  }

  return (
    <div data-testid='testJsonDisplay' className='w-full'>
      <ReactJson
        src={preview.value}
        iconStyle='circle'
        theme={theme}
        collapseStringsAfterLength={100}
        shouldCollapse={(field) => {
          return field.type === 'object' && Object.entries(field.src).length > collapseAtEntry
            ? true
            : false
        }}
      />
    </div>
  )
}
