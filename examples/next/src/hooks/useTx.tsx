import { useApi } from '@/hooks/useApi'
import { useWallets } from '@/hooks/useWallet'
import { signAndSendTx, TransactionSignedAndSend } from '@autonomys/auto-consensus'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import { useCallback, useState } from 'react'

export const useTx = () => {
  const { handleQuery } = useApi()
  const { selectedWallet } = useWallets()
  const [txHash, setTxHash] = useState('')

  const handleTx = useCallback(
    async (tx: SubmittableExtrinsic<'promise', ISubmittableResult>, setErrorForm: any) => {
      try {
        if (!selectedWallet) {
          setErrorForm('Wallet not selected')
          return
        }
        await handleQuery(
          await signAndSendTx(selectedWallet.accounts[0], tx, [], false),
          () => setTxHash(tx.hash.toString()),
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
