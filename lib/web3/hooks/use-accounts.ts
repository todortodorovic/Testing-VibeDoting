import { useQuery } from "@tanstack/react-query"
import { WalletProviderType, Account } from "@/lib/web3/types/web3"
import { getWalletByType } from "../wallets"
import { toGenericSubstrateAddress } from "../utils/address"

export function useWalletAccounts(type?: WalletProviderType | null) {
  return useQuery({
    queryKey: ["wallet-accounts", type],
    queryFn: async () => {
      if (!type) return []

      const provider = getWalletByType(type)
      if (!provider?.wallet) return []

      const accounts = await provider.wallet.getAccounts()

      return accounts.map((account) => {
        const genericAddress = toGenericSubstrateAddress(account.address)
        return {
          name: account.name || "",
          address: genericAddress || account.address, // Use generic format (prefix 42) for Paseo compatibility
          displayAddress: genericAddress || account.address,
          provider: type,
        } as Account
      })
    },
    enabled: !!type,
    staleTime: 5000,
  })
}
