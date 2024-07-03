import { useApi } from '@/hooks/useApi'
import { useWallets } from '@/hooks/useWallet'
import { useCallback, useState } from 'react'

export const useTx = () => {
  const { handleQuery } = useApi()
  const { selectedWallet } = useWallets()
  const [txHash, setTxHash] = useState('')

  const handleTx = useCallback(
    async (tx: any, setErrorForm: any) => {
      try {
        if (!selectedWallet) {
          setErrorForm('Wallet not selected')
          return
        }
        await handleQuery(
          await tx.signAndSend(selectedWallet.accounts[0], (result: any) => {
            if (result.status.isInBlock) console.log('Successful tx')
            else if (result.status.isFinalized) console.log('Finalized tx')
          }),
          (v) => setTxHash(v.hash.toString()),
          setErrorForm,
        )
      } catch (error) {
        setErrorForm((error as any).message)
      }
    },
    [handleQuery, selectedWallet],
  )

  return { handleTx, txHash }
}
