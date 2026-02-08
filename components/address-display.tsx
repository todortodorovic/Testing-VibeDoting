"use client"

import { useState } from "react"
import { Copy, Check, ExternalLink } from "lucide-react"
import { analyzeAddress, formatAddress } from "@/lib/utils/address-utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AddressDisplayProps {
  address: string
  format?: "short" | "medium" | "long" | "full"
  showCopy?: boolean
  showExplorer?: boolean
  showNetwork?: boolean
  explorerUrl?: string
}

export function AddressDisplay({
  address,
  format = "short",
  showCopy = true,
  showExplorer = false,
  showNetwork = false,
  explorerUrl,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false)
  const info = analyzeAddress(address)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getTypeColor = () => {
    if (!info.valid) return "text-red-500"
    switch (info.type) {
      case "ss58": return "text-blue-500"
      case "evm": return "text-green-500"
      case "hex": return "text-yellow-500"
      default: return "text-gray-500"
    }
  }

  return (
    <div className="flex items-center gap-2">
      {showNetwork && info.network && (
        <span className="px-2 py-1 text-xs rounded bg-secondary">
          {info.network}
        </span>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <code className={`font-mono text-sm ${getTypeColor()}`}>
            {formatAddress(address, format)}
          </code>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-mono text-xs break-all">{address}</div>
            {info.type === "ss58" && info.evm && (
              <div className="text-xs text-muted-foreground">
                EVM: {formatAddress(info.evm, "short")}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {showCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      )}

      {showExplorer && explorerUrl && (
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-6 w-6 p-0"
        >
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </div>
  )
}
