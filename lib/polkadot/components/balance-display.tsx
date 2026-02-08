"use client"

import { useBalance } from "../hooks/use-balance"
import { formatBalanceShort } from "../utils/format-balance"
import { Loader2 } from "lucide-react"

export function BalanceDisplay({ showTransferable = true }: { showTransferable?: boolean }) {
  const { data: balance, isLoading, error } = useBalance()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading balance...</span>
      </div>
    )
  }

  if (error || !balance) {
    return (
      <div className="text-sm text-muted-foreground">
        {error ? "Failed to load balance" : "No balance available"}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-muted-foreground">Balance:</span>
        <span className="text-lg font-semibold">
          {formatBalanceShort(balance.free, balance.decimals, balance.symbol)}
        </span>
      </div>
      {showTransferable && (
        <div className="text-xs text-muted-foreground">
          Transferable: {formatBalanceShort(balance.transferable, balance.decimals, balance.symbol)}
        </div>
      )}
    </div>
  )
}
