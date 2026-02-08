"use client"

import { useQuery } from "@tanstack/react-query"
import { getTypedApi } from "../client"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { FeeEstimate } from "../types/transfer"
import { formatBalance } from "../utils/format-balance"
import { MultiAddress } from "@polkadot-api/descriptors"
import { CHAIN_CONFIG } from "../constants"

export function useTransferFee(to: string | null, amount: bigint | null) {
  const { account } = useAccount()

  return useQuery({
    queryKey: ["transfer-fee", account?.address, to, amount?.toString()],
    queryFn: async (): Promise<FeeEstimate> => {
      if (!account?.address || !to || !amount) {
        return { estimatedFee: 0n, formattedFee: "0", canAfford: false }
      }

      const api = getTypedApi()

      const tx = api.tx.Balances.transfer_keep_alive({
        dest: MultiAddress.Id(to),
        value: amount,
      })

      const paymentInfo = await tx.getEstimatedFees(account.address)

      return {
        estimatedFee: paymentInfo,
        formattedFee: formatBalance(paymentInfo, CHAIN_CONFIG.decimals, CHAIN_CONFIG.symbol),
        canAfford: true,
      }
    },
    enabled: !!account?.address && !!to && !!amount,
    staleTime: 5000,
  })
}
