"use client"

import { useEffect, useState } from "react"
import { useTransactionStore } from "../store/transaction-store"
import { TransactionInfo, TransactionStatus } from "../types/transaction-tracker"
import { TransactionLogger } from "../utils/transaction-logger"

interface UseTransactionTrackerOptions {
  enableLogging?: boolean
  onFinalized?: (tx: TransactionInfo) => void
  onError?: (tx: TransactionInfo, error: string) => void
}

export function useTransactionTracker(
  options: UseTransactionTrackerOptions = {}
) {
  const { enableLogging = true, onFinalized, onError } = options

  const transaction = useTransactionStore((s) => s.currentTransaction)

  const [logger] = useState(() => new TransactionLogger(enableLogging))

  // Log transaction events
  useEffect(() => {
    if (!transaction || !logger) return

    switch (transaction.status) {
      case TransactionStatus.Preparing:
      case TransactionStatus.Signing:
      case TransactionStatus.Broadcasting:
        // Already logged in transfer hook
        break

      case TransactionStatus.Broadcasted:
        if (transaction.txHash) {
          logger.broadcasted(transaction.txHash)
        }
        break

      case TransactionStatus.InBlock:
        if (transaction.txHash && transaction.blockHash && transaction.blockNumber) {
          logger.inBlock(transaction.txHash, transaction.blockHash, transaction.blockNumber)
        }
        break

      case TransactionStatus.Finalized:
        if (transaction.txHash && transaction.blockHash && transaction.blockNumber) {
          logger.finalized(
            transaction.txHash,
            transaction.blockHash,
            transaction.blockNumber,
            transaction.confirmations
          )
          logger.timeline(transaction.events)
          logger.summary(transaction)
          onFinalized?.(transaction)
        }
        break

      case TransactionStatus.Failed:
        logger.error(transaction.error || "Unknown error")
        logger.summary(transaction)
        onError?.(transaction, transaction.error || "Transaction failed")
        break

      case TransactionStatus.Cancelled:
        logger.cancelled()
        break
    }
  }, [transaction?.status, transaction?.confirmations, logger, onFinalized, onError])

  return {
    transaction,
    isTracking: !!transaction &&
      transaction.status !== TransactionStatus.Finalized &&
      transaction.status !== TransactionStatus.Failed &&
      transaction.status !== TransactionStatus.Cancelled,
  }
}
