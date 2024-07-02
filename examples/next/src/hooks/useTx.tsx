import { useApi } from '@/hooks/useApi'
import { useWallets } from '@/hooks/useWallet'
import { useCallback, useState } from 'react'

export const useTx = () => {
  const { api } = useApi()
  const { selectedWallet } = useWallets()
  const [txHash, setTxHash] = useState('')

  const handleTx = useCallback(
    async (tx: any, setErrorForm: any) => {
      setErrorForm('')
      try {
        if (!api || !selectedWallet) {
          setErrorForm('API not loaded')
          return
        }

        if (!tx) {
          setErrorForm('Error creating deregister operator tx')
          return
        }

        setTxHash(tx.hash.toString())

        await tx.signAndSend(selectedWallet.accounts[0], (result: any) => {
          console.log('deregister result', result)
          if (result.status.isInBlock) {
            console.log('Successful deregister of operator')
          } else if (result.status.isFinalized) {
            console.log('Finalized deregister of operator')
          }
        })
      } catch (error) {
        setErrorForm((error as any).message)
      }
    },
    [api, selectedWallet],
  )

  return { handleTx, txHash }
}
