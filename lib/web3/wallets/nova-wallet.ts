import { BaseDotsamaWallet } from "@talismn/connect-wallets"
import { WalletProviderType } from "@/lib/web3/types/web3"

declare global {
  interface Window {
    walletExtension?: {
      isNovaWallet?: boolean
    }
  }
}

export class NovaWallet extends BaseDotsamaWallet {
  extensionName = WalletProviderType.PolkadotJS // Nova Wallet acts as polkadot-js wallet
  title = "Nova Wallet"
  installUrl = "https://novawallet.io"

  get installed() {
    const injectedExtension = window?.injectedWeb3?.[this.extensionName]
    const isNovaWallet = window?.walletExtension?.isNovaWallet

    return !!(injectedExtension && isNovaWallet)
  }
}
