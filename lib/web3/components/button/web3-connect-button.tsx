"use client"

import { useAccount } from "@/lib/web3/hooks/use-account"
import { useWeb3Store } from "@/lib/web3/store/use-web3-store"
import { AccountDropdown } from "./account-dropdown"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Web3ConnectButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
}

export function Web3ConnectButton({ className, variant = "default" }: Web3ConnectButtonProps) {
  const { account } = useAccount()
  const { toggle } = useWeb3Store()

  if (account) {
    return <AccountDropdown account={account} className={className} />
  }

  return (
    <Button onClick={toggle} variant={variant} className={cn("gap-2", className)}>
      <Wallet className="h-5 w-5" />
      <span className="font-medium">Connect Wallet</span>
    </Button>
  )
}
