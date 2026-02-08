"use client"

import Link from "next/link"
import { Web3ConnectButton, useAccount } from "@/lib/web3"
import { AddressDisplay } from "@/components/address-display"
import { analyzeAddress, normalizeAddress, NETWORK_PREFIXES } from "@/lib/utils/address-utils"

export default function Home() {
  const { account } = useAccount()

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Polkadot Wallet Demo</h1>
          <Web3ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">
              Welcome to Polkadot Wallet Connection
            </h2>
            <p className="text-lg text-muted-foreground">
              Connect your Polkadot wallet to get started
            </p>
          </div>

          {account ? (
            <div className="space-y-4">
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <h3 className="text-xl font-semibold">Connected Account</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="font-medium">{account.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Provider:</span>
                    <span className="font-medium">{account.provider}</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-sm font-semibold">Address Formats</h4>

                  {(() => {
                    const info = analyzeAddress(account.address)
                    const polkadotAddr = normalizeAddress(account.address, NETWORK_PREFIXES.POLKADOT)
                    const kusamaAddr = normalizeAddress(account.address, NETWORK_PREFIXES.KUSAMA)
                    const genericAddr = normalizeAddress(account.address, NETWORK_PREFIXES.GENERIC)

                    return (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Generic (SS58 prefix 42)</span>
                          <div className="flex items-center gap-2">
                            <AddressDisplay address={genericAddr || account.address} format="medium" />
                          </div>
                        </div>

                        {polkadotAddr && (
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Polkadot (prefix 0)</span>
                            <div className="flex items-center gap-2">
                              <AddressDisplay address={polkadotAddr} format="medium" />
                            </div>
                          </div>
                        )}

                        {kusamaAddr && (
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Kusama (prefix 2)</span>
                            <div className="flex items-center gap-2">
                              <AddressDisplay address={kusamaAddr} format="medium" />
                            </div>
                          </div>
                        )}

                        {info.evm && (
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">EVM / H160</span>
                            <div className="flex items-center gap-2">
                              <AddressDisplay address={info.evm} format="medium" />
                            </div>
                          </div>
                        )}

                        {info.network && (
                          <div className="pt-2 text-xs text-muted-foreground">
                            Detected network: <span className="font-medium text-foreground">{info.network}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
              <Link
                href="/transfer"
                className="inline-flex items-center justify-center w-full h-11 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Send Funds
              </Link>
            </div>
          ) : (
            <div className="bg-card border rounded-lg p-12 text-center space-y-4">
              <p className="text-muted-foreground">
                No wallet connected. Click the button above to connect your wallet.
              </p>
            </div>
          )}

          {/* Features Section */}
          <div className="grid md:grid-cols-2 gap-4 pt-8">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Multi-Wallet Support</h3>
              <p className="text-sm text-muted-foreground">
                Connect with Polkadot.js, Talisman, Nova Wallet, SubWallet, or use an external address
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">External Wallet</h3>
              <p className="text-sm text-muted-foreground">
                View any Substrate address in read-only mode without connecting a wallet
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">SS58 Format</h3>
              <p className="text-sm text-muted-foreground">
                Automatic address conversion to generic Substrate format (prefix 42)
              </p>
            </div>
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Persistent State</h3>
              <p className="text-sm text-muted-foreground">
                Your connection is saved locally and restored on page refresh
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with Next.js, React, Zustand, React Query, and Polkadot.js</p>
        </div>
      </footer>
    </main>
  )
}
