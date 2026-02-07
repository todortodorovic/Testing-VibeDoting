"use client"

import { Account } from "@/lib/web3/types/web3"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { shortenAddress } from "@/lib/web3/utils/format"
import { useDisconnect } from "@/lib/web3/hooks/use-disconnect"
import { LogOut, Copy, Check, ChevronsUpDown } from "lucide-react"
import { useState } from "react"
import { AccountAvatar } from "@/lib/web3/components/ui/account-avatar"
import { cn } from "@/lib/utils"

interface AccountDropdownProps {
  account: Account
  className?: string
}

export function AccountDropdown({ account, className }: AccountDropdownProps) {
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(account.displayAddress || account.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
            className
          )}
        >
          <AccountAvatar
            address={account.address}
            size={32}
            className="rounded-lg"
            provider={account.provider}
          />
          <div className="flex flex-col items-start text-left">
            <span className="truncate font-medium text-sm">{account.name}</span>
            <span className="truncate text-xs font-mono text-muted-foreground">
              {shortenAddress(account.displayAddress || account.address)}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <AccountAvatar
              address={account.address}
              size={32}
              className="rounded-lg"
              provider={account.provider}
            />
            <div className="flex flex-col">
              <span className="truncate font-medium">{account.name}</span>
              <span className="truncate text-xs font-mono text-muted-foreground">
                {shortenAddress(account.displayAddress || account.address)}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied!" : "Copy Address"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()} className="text-red-600">
          <LogOut />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
