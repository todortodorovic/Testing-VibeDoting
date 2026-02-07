import { useMutation } from "@tanstack/react-query"
import { WalletProviderType, WalletProviderStatus } from "@/lib/web3/types/web3"
import { useWeb3Store } from "../store/use-web3-store"
import { getWalletByType } from "../wallets"
import { POLKADOT_APP_NAME } from "../constants/chains"

export function useConnect() {
  const { setStatus, setError } = useWeb3Store()

  return useMutation({
    mutationFn: async (walletType: WalletProviderType) => {
      const provider = getWalletByType(walletType)

      if (!provider?.wallet) {
        throw new Error("Wallet not found")
      }

      if (!provider.wallet.installed) {
        throw new Error("Wallet not installed")
      }

      setStatus(walletType, WalletProviderStatus.Pending)

      try {
        await provider.wallet.enable(POLKADOT_APP_NAME)
        const accounts = await provider.wallet.getAccounts()

        setStatus(walletType, WalletProviderStatus.Connected)

        return accounts
      } catch (error) {
        setStatus(walletType, WalletProviderStatus.Error)
        setError(error instanceof Error ? error.message : "Failed to connect")
        throw error
      }
    },
  })
}
