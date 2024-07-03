import { FC } from 'react'

interface InputProps {
  id?: string
  value?: string
  set?: (e: string) => void
}

export const AmountInput: FC<InputProps> = ({ id = 'amount', value, set }) => (
  <input
    id={id}
    type='number'
    value={value}
    onChange={(e) => set && set(e.target.value)}
    className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
  />
)
