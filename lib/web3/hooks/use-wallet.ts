import { useWeb3Store } from "../store/use-web3-store"
import { getWalletByType } from "../wallets"

export function useWallet() {
  const providerType = useWeb3Store((state) => state.account?.provider)
  const wallet = getWalletByType(providerType)

  return {
    wallet: wallet?.wallet || null,
    type: wallet?.type || null,
  }
}
