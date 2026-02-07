"use client"

import { Account } from "@/lib/web3/types/web3"
import { shortenAddress } from "@/lib/web3/utils/format"
import { Check } from "lucide-react"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { cn } from "@/lib/utils"
import { AccountAvatar } from "@/lib/web3/components/ui/account-avatar"

interface AccountSelectProps {
  accounts: Account[]
  isLoading: boolean
  onSelectAccount: (account: Account) => void
}

export function AccountSelect({
  accounts,
  isLoading,
  onSelectAccount,
}: AccountSelectProps) {
  const { account: currentAccount } = useAccount()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-secondary/50 animate-pulse"
          >
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No accounts found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {accounts.map((account) => {
        const isSelected =
          currentAccount?.address === account.address &&
          currentAccount?.provider === account.provider

        return (
          <button
            key={`${account.provider}-${account.address}`}
            onClick={() => onSelectAccount(account)}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-lg border transition-all",
              isSelected
                ? "border-blue-500 bg-blue-500/10"
                : "border-border bg-secondary/30 hover:bg-secondary/60"
            )}
          >
            <AccountAvatar
              address={account.address}
              size={40}
              provider={account.provider}
            />
            <div className="text-left flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {account.name || "Unnamed Account"}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {shortenAddress(account.displayAddress || account.address, 8, 6)}
              </div>
            </div>
            {isSelected && (
              <Check className="h-4 w-4 text-blue-500 shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}
