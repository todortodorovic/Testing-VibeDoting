import { WalletProviderType } from "@/lib/web3/types/web3"
import { useWeb3Store } from "../store/use-web3-store"

export function useDisconnect() {
  const { disconnect } = useWeb3Store()

  return {
    disconnect: (provider?: WalletProviderType) => {
      disconnect(provider)
    },
  }
}
