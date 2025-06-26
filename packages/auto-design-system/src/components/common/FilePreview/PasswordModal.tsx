import React, { useCallback, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../astral/Modal/Modal'

export interface PasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => void
}

export const PasswordModal = ({ isOpen, onClose, onConfirm }: PasswordModalProps) => {
  const [password, setPassword] = useState('')

  const handleConfirm = useCallback(() => {
    onConfirm(password)
    onClose()
    setPassword('')
  }, [onClose, password, onConfirm])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='text-lg font-normal text-gray-900 dark:text-white'>
            Enter Decryption Password
          </DialogTitle>
        </DialogHeader>
        <div className='text-center'>
          <input
            id='password'
            type='password'
            placeholder='Enter Password'
            className='w-full rounded border p-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-auto-explorer-primaryAccent'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className='mt-4 rounded-lg text-xs bg-auto-explorer-buttonLightFrom px-4 py-2.5 font-normal leading-4 text-white dark:bg-auto-explorer-buttonDarkFrom'
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
