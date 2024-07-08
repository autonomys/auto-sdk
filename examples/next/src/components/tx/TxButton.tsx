import { FC } from 'react'
import { TxReceipt } from './Receipt'

interface TxButtonProps {
  label: string
  onClick: () => void
}

export const TxButton: FC<TxButtonProps> = ({ label, onClick }) => {
  return (
    <>
      <button
        onClick={onClick}
        className='mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
      >
        {label}
      </button>
      <TxReceipt />
    </>
  )
}
