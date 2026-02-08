"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getTypedApi } from "../client"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { TransferParams, TransferResult, TransactionStatus as TransferStatus } from "../types/transfer"
import { connectInjectedExtension } from "polkadot-api/pjs-signer"
import { MultiAddress } from "@polkadot-api/descriptors"
import { useTransactionStore } from "../store/transaction-store"
import {
  TransactionInfo,
  TransactionStatus,
  TransactionEvent
} from "../types/transaction-tracker"
import { TransactionLogger } from "../utils/transaction-logger"

export function useTransfer() {
  const { account } = useAccount()
  const queryClient = useQueryClient()
  const txStore = useTransactionStore()

  return useMutation({
    mutationFn: async (params: TransferParams): Promise<TransferResult> => {
      if (!account) {
        throw new Error("No account connected")
      }

      if (account.provider === "external") {
        throw new Error("External wallets cannot sign transactions")
      }

      const logger = new TransactionLogger(true)

      // Initialize transaction info
      const txInfo: TransactionInfo = {
        status: TransactionStatus.Preparing,
        confirmations: 0,
        events: [],
        timestamp: Date.now(),
        fromAddress: account.address,
        toAddress: params.to,
        amount: params.amount,
      }

      // Set as current transaction
      txStore.setCurrentTransaction(txInfo)

      // Log preparing
      logger.preparing(
        account.address,
        params.to,
        `${params.amount.toString()} (raw)`
      )

      try {
        // Update: Signing
        txStore.updateCurrentTransaction({ status: TransactionStatus.Signing })
        logger.signing()

        const api = getTypedApi()

        // Connect to wallet
        let extension
        try {
          extension = await connectInjectedExtension(account.provider)
        } catch (e) {
          const error = "Wallet extension rejected the connection or is unavailable"
          txStore.updateCurrentTransaction({
            status: TransactionStatus.Cancelled,
            error,
          })
          throw new Error(error)
        }

        const accounts = extension.getAccounts()
        const signerAccount = accounts.find((a) => a.address === account.address)

        if (!signerAccount) {
          extension.disconnect()
          const error = "Account not found in wallet extension"
          txStore.updateCurrentTransaction({
            status: TransactionStatus.Failed,
            error,
          })
          throw new Error(error)
        }

        // Create transaction
        const tx = api.tx.Balances.transfer_keep_alive({
          dest: MultiAddress.Id(params.to),
          value: params.amount,
        })

        // Update: Broadcasting
        txStore.updateCurrentTransaction({ status: TransactionStatus.Broadcasting })
        logger.broadcasting()

        // Sign and submit with watching
        const observable = tx.signSubmitAndWatch(signerAccount.polkadotSigner)

        return new Promise((resolve, reject) => {
          const subscription = observable.subscribe({
            next: (event) => {
              const txEvent: TransactionEvent = {
                type: event.type as any,
                timestamp: Date.now(),
              }

              if (event.type === "broadcasted") {
                txStore.updateCurrentTransaction({
                  status: TransactionStatus.Broadcasted,
                  events: [...(useTransactionStore.getState().currentTransaction?.events || []), txEvent],
                })
              } else if (event.type === "txBestBlocksState") {
                if (event.found) {
                  const inBlockEvent: TransactionEvent = {
                    ...txEvent,
                    txHash: event.txHash,
                    blockHash: event.block.hash,
                    blockNumber: event.block.number,
                  }

                  txStore.updateCurrentTransaction({
                    txHash: event.txHash,
                    status: TransactionStatus.InBlock,
                    blockHash: event.block.hash,
                    blockNumber: event.block.number,
                    confirmations: 1,
                    events: [...(useTransactionStore.getState().currentTransaction?.events || []), inBlockEvent],
                  })
                }
              } else if (event.type === "finalized") {
                const finalizedEvent: TransactionEvent = {
                  ...txEvent,
                  txHash: event.txHash,
                  blockHash: event.block.hash,
                  blockNumber: event.block.number,
                }

                const currentTx = useTransactionStore.getState().currentTransaction
                const confirmations = currentTx?.blockNumber
                  ? event.block.number - currentTx.blockNumber + 1
                  : 1

                txStore.updateCurrentTransaction({
                  status: TransactionStatus.Finalized,
                  blockHash: event.block.hash,
                  blockNumber: event.block.number,
                  confirmations,
                  events: [...(currentTx?.events || []), finalizedEvent],
                })

                resolve({
                  txHash: event.txHash,
                  blockHash: event.block.hash,
                  blockNumber: event.block.number,
                  status: TransferStatus.Finalized,
                })

                subscription.unsubscribe()
                extension.disconnect()
              }
            },
            error: (error) => {
              console.error("Transaction error:", error)
              const errorMsg = error.message || "Transaction failed"

              txStore.updateCurrentTransaction({
                status: TransactionStatus.Failed,
                error: errorMsg,
              })

              reject(new Error(errorMsg))
              subscription.unsubscribe()
              extension.disconnect()
            },
          })
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        txStore.updateCurrentTransaction({
          status: TransactionStatus.Failed,
          error: errorMsg,
        })
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance"] })
    },
  })
}
