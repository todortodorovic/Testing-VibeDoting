"use client"

import { useTransactionTracker } from "../hooks/use-transaction-tracker"
import { TransactionStatus } from "../types/transaction-tracker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, Clock, Radio, AlertCircle } from "lucide-react"
import { formatBalance } from "../utils/format-balance"
import { CHAIN_CONFIG } from "../constants"

interface TransactionTrackerProps {
  onFinalized?: () => void
  showDetails?: boolean
}

export function TransactionTracker({
  onFinalized,
  showDetails = true
}: TransactionTrackerProps) {
  const { transaction, isTracking } = useTransactionTracker({
    enableLogging: true,
    onFinalized,
  })

  if (!transaction) return null

  const getStatusIcon = () => {
    switch (transaction.status) {
      case TransactionStatus.Preparing:
      case TransactionStatus.Signing:
      case TransactionStatus.Broadcasting:
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />

      case TransactionStatus.Broadcasted:
        return <Radio className="h-6 w-6 text-blue-500 animate-pulse" />

      case TransactionStatus.InBlock:
        return <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />

      case TransactionStatus.Finalized:
        return <CheckCircle2 className="h-6 w-6 text-green-500" />

      case TransactionStatus.Failed:
        return <XCircle className="h-6 w-6 text-red-500" />

      case TransactionStatus.Cancelled:
        return <AlertCircle className="h-6 w-6 text-orange-500" />

      default:
        return <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (transaction.status) {
      case TransactionStatus.Preparing:
        return "Preparing Transaction"
      case TransactionStatus.Signing:
        return "Awaiting Signature"
      case TransactionStatus.Broadcasting:
        return "Broadcasting Transaction"
      case TransactionStatus.Broadcasted:
        return "Transaction Broadcasted"
      case TransactionStatus.InBlock:
        return "Transaction In Block"
      case TransactionStatus.Finalized:
        return "Transaction Finalized"
      case TransactionStatus.Failed:
        return "Transaction Failed"
      case TransactionStatus.Cancelled:
        return "Transaction Cancelled"
      default:
        return "Processing Transaction"
    }
  }

  const getStatusColor = () => {
    switch (transaction.status) {
      case TransactionStatus.Finalized:
        return "text-green-500"
      case TransactionStatus.Failed:
        return "text-red-500"
      case TransactionStatus.Cancelled:
        return "text-orange-500"
      case TransactionStatus.InBlock:
        return "text-yellow-500"
      default:
        return "text-blue-500"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <CardTitle className={getStatusColor()}>{getStatusText()}</CardTitle>
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-4">
          {/* Transaction Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">From:</span>
              <span className="font-mono text-xs">
                {transaction.fromAddress.slice(0, 8)}...{transaction.fromAddress.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To:</span>
              <span className="font-mono text-xs">
                {transaction.toAddress.slice(0, 8)}...{transaction.toAddress.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">
                {formatBalance(transaction.amount, CHAIN_CONFIG.decimals, CHAIN_CONFIG.symbol)}
              </span>
            </div>
          </div>

          {/* Transaction Hash */}
          {transaction.txHash && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Transaction Hash:</span>
              <div className="bg-secondary/50 rounded p-2 font-mono text-xs break-all">
                {transaction.txHash}
              </div>
            </div>
          )}

          {/* Block Info */}
          {transaction.blockNumber && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/50 rounded">
              <div>
                <div className="text-xs text-muted-foreground">Block Number</div>
                <div className="font-semibold">#{transaction.blockNumber}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Confirmations</div>
                <div className="font-semibold">{transaction.confirmations}</div>
              </div>
            </div>
          )}

          {/* Block Hash */}
          {transaction.blockHash && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Block Hash:</span>
              <div className="bg-secondary/50 rounded p-2 font-mono text-xs break-all">
                {transaction.blockHash}
              </div>
            </div>
          )}

          {/* Error Message */}
          {transaction.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
              <div className="text-sm font-medium text-red-500">Error</div>
              <div className="text-xs text-red-500/80 mt-1">{transaction.error}</div>
            </div>
          )}

          {/* Progress Indicator */}
          {isTracking && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{transaction.confirmations} confirmations</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: `${Math.min((transaction.confirmations / 3) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Timeline */}
          {transaction.events.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm font-medium">Event Timeline</div>
              <div className="space-y-1">
                {transaction.events.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>
                      {new Date(event.timestamp).toLocaleTimeString()} - {event.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
