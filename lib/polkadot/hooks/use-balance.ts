"use client"

import { useQuery } from "@tanstack/react-query"
import { getTypedApi } from "../client"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { Balance } from "../types/transfer"
import { CHAIN_CONFIG } from "../constants"

export function useBalance() {
  const { account } = useAccount()

  return useQuery({
    queryKey: ["balance", account?.address],
    queryFn: async (): Promise<Balance | null> => {
      if (!account?.address) return null

      const api = getTypedApi()
      const accountInfo = await api.query.System.Account.getValue(account.address)

      if (!accountInfo) return null

      const { free, reserved, frozen } = accountInfo.data
      const transferable = free - frozen

      return {
        free,
        reserved,
        frozen,
        transferable,
        decimals: CHAIN_CONFIG.decimals,
        symbol: CHAIN_CONFIG.symbol,
      }
    },
    enabled: !!account?.address,
    refetchInterval: 10000,
    staleTime: 5000,
  })
}
