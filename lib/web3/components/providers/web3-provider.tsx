"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { Web3ConnectModal } from "../modal/web3-connect-modal"
import { isInHost } from "@/lib/host/detect"
import { connectToHost } from "@/lib/host/connection"
import { getHostAccounts, subscribeHostAccounts } from "@/lib/host/accounts"
import { useWeb3Store } from "../../store/use-web3-store"
import { WalletProviderType, WalletProviderStatus } from "../../types/web3"

function HostAutoConnect() {
  const initializedRef = useRef(false)
  const { setAccount, setStatus } = useWeb3Store()

  useEffect(() => {
    if (initializedRef.current) return
    if (!isInHost()) return
    initializedRef.current = true

    async function init() {
      // Step 1: Inject Spektr extension
      const ready = await connectToHost()
      if (!ready) return

      // Step 2: Get accounts from host
      const accounts = await getHostAccounts()
      if (accounts.length > 0) {
        // Step 3: Set first account in store
        setAccount({
          name: accounts[0].name,
          address: accounts[0].address,
          provider: WalletProviderType.HostAPI,
        })
        setStatus(WalletProviderType.HostAPI, WalletProviderStatus.Connected)
      }

      // Step 4: Subscribe to account changes (login/logout in host)
      subscribeHostAccounts((newAccounts) => {
        if (newAccounts.length > 0) {
          setAccount({
            name: newAccounts[0].name,
            address: newAccounts[0].address,
            provider: WalletProviderType.HostAPI,
          })
        } else {
          setAccount(null)
        }
      })
    }

    init().catch(console.error)
  }, [setAccount, setStatus])

  return null
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <HostAutoConnect />
      {children}
      <Web3ConnectModal />
    </QueryClientProvider>
  )
}
