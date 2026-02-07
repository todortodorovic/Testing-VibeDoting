"use client"

import { useState } from "react"
import { WalletProviderType } from "@/lib/web3/types/web3"
import { WALLET_INFO } from "@/lib/web3/constants/wallets"
import { getSupportedWallets } from "@/lib/web3/wallets"
import { Download, ChevronRight, Eye, ChevronDown } from "lucide-react"

interface WalletListProps {
  onSelectWallet: (type: WalletProviderType) => void
}

export function WalletList({ onSelectWallet }: WalletListProps) {
  const [showOthers, setShowOthers] = useState(false)

  const wallets = getSupportedWallets()

  const { installed, notInstalled } = wallets.reduce<{
    installed: typeof wallets
    notInstalled: typeof wallets
  }>(
    (acc, wallet) => {
      if (wallet.wallet.installed || wallet.type === WalletProviderType.ExternalWallet) {
        acc.installed.push(wallet)
      } else {
        acc.notInstalled.push(wallet)
      }
      return acc
    },
    { installed: [], notInstalled: [] }
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-3">Installed</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {installed.map(({ wallet, type }) => {
            const info = WALLET_INFO[type]
            const isExternal = type === WalletProviderType.ExternalWallet

            return (
              <button
                key={type}
                onClick={() => onSelectWallet(type)}
                className="relative flex flex-col items-center gap-2 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors group"
              >
                {isExternal ? (
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-blue-400" />
                  </div>
                ) : wallet.logo?.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={wallet.logo.src}
                    alt={wallet.logo.alt}
                    className="h-12 w-12"
                  />
                ) : null}
                <p className="text-xs text-center font-medium">{info?.name || wallet.title}</p>
                <p className="text-xs text-blue-400 flex items-center gap-1">
                  Continue
                  <ChevronRight className="h-3 w-3" />
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {notInstalled.length > 0 && (
        <div>
          <div className="border-t border-border mb-4" />

          <button
            onClick={() => setShowOthers(!showOthers)}
            className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <span>Other</span>
            <span className="flex items-center gap-1">
              {showOthers ? "Hide" : "Show"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showOthers ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          {showOthers && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {notInstalled.map(({ wallet, type }) => {
                const info = WALLET_INFO[type]
                const downloadUrl = info?.downloadUrl || wallet.installUrl

                return (
                  <button
                    key={type}
                    onClick={() => {
                      if (downloadUrl) {
                        window.open(downloadUrl, "_blank", "noopener,noreferrer")
                      }
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    {wallet.logo?.src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={wallet.logo.src}
                        alt={wallet.logo.alt}
                        className="h-12 w-12 opacity-70"
                      />
                    )}
                    <p className="text-xs text-center font-medium">{info?.name || wallet.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Download
                      <Download className="h-3 w-3" />
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
