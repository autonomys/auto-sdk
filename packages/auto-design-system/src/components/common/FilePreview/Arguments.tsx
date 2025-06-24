import { FC, useEffect, useState } from 'react'
import ReactJson from 'react-json-view'

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

export const Arguments: FC<Props> = ({ file, collapseAtEntry = 5 }) => {
  const [args, setArgs] = useState<object>()

  useEffect(() => {
    file.text().then((text) => {
      setArgs(JSON.parse(text))
    })
  }, [file])

  return (
    <div data-testid='testJsonDisplay' className='w-full'>
      <ReactJson
        src={args || {}}
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
