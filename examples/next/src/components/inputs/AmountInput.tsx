import { formatTokenAmount } from '@autonomys/auto-utils'
import { FC } from 'react'

interface InputProps {
  id?: string
  value?: string
  options?: string[]
  set?: (e: string) => void
  formatOption?: (e: number | bigint) => string
}

export const AmountInput: FC<InputProps> = ({
  id = 'amount',
  value,
  options,
  set,
  formatOption = formatTokenAmount,
}) => (
  <div className='relative inline-block'>
    <input
      id={id}
      type='number'
      value={value}
      onChange={(e) => set && set(e.target.value)}
      className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
    />
    {options &&
      options.map((option, index) => (
        <>
          <button
            key={`address-receiver-index-${index}`}
            className={'relative items-center gap-2 rounded-full'}
            onClick={() => set && set(formatOption(parseInt(option)).toString())}
          >
            {option}
          </button>
          {` `}
        </>
      ))}
  </div>
)
