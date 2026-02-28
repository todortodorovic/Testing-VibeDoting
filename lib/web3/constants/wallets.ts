import { WalletProviderType } from "@/lib/web3/types/web3"

export const SUPPORTED_WALLETS: WalletProviderType[] = [
  WalletProviderType.PolkadotJS,
  WalletProviderType.NovaWallet,
  WalletProviderType.Talisman,
  WalletProviderType.ExternalWallet,
]

export const WALLET_INFO: Record<
  WalletProviderType,
  {
    name: string
    description: string
    downloadUrl?: string
  }
> = {
  [WalletProviderType.PolkadotJS]: {
    name: "Polkadot{.js}",
    description: "Basic account management for Polkadot & Substrate",
    downloadUrl: "https://polkadot.js.org/extension/",
  },
  [WalletProviderType.NovaWallet]: {
    name: "Nova Wallet",
    description: "Next-gen wallet for Polkadot & Kusama ecosystem",
    downloadUrl: "https://novawallet.io/",
  },
  [WalletProviderType.Talisman]: {
    name: "Talisman",
    description: "A better wallet for Web3",
    downloadUrl: "https://talisman.xyz/",
  },
  [WalletProviderType.SubwalletJS]: {
    name: "SubWallet",
    description: "The comprehensive Polkadot & Ethereum wallet",
    downloadUrl: "https://subwallet.app/",
  },
  [WalletProviderType.WalletConnect]: {
    name: "WalletConnect",
    description: "Connect with mobile wallets",
  },
  [WalletProviderType.ExternalWallet]: {
    name: "External Wallet",
    description: "View-only mode for any address",
  },
  [WalletProviderType.HostAPI]: {
    name: "Polkadot App",
    description: "Account from Polkadot Triangle host",
  },
}
