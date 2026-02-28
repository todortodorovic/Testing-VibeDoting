import { Wallet, WalletAccount } from "@talismn/connect-wallets"

export enum WalletProviderType {
  PolkadotJS = "polkadot-js",
  Talisman = "talisman",
  SubwalletJS = "subwallet-js",
  NovaWallet = "nova-wallet",
  WalletConnect = "walletconnect",
  ExternalWallet = "external",
  HostAPI = "host-api",
}

export enum WalletProviderStatus {
  Connected = "connected",
  Pending = "pending",
  Disconnected = "disconnected",
  Error = "error",
}

export type Account = {
  name: string
  address: string
  displayAddress?: string
  genesisHash?: `0x${string}`
  provider: WalletProviderType
  isExternalWalletConnected?: boolean
}

export type WalletProvider = {
  type: WalletProviderType
  wallet: Wallet
}

export type WalletProviderEntry = {
  type: WalletProviderType
  status: WalletProviderStatus
}

export type PolkadotNamespaceChainId = `polkadot:${string}`

export interface Web3State {
  open: boolean
  providers: WalletProviderEntry[]
  recentProvider: WalletProviderType | null
  account: Account | null
  error?: string
}
