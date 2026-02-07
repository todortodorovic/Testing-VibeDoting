// Components
export { Web3ConnectButton } from "./components/button/web3-connect-button"
export { AccountDropdown } from "./components/button/account-dropdown"
export { Web3ConnectModal } from "./components/modal/web3-connect-modal"
export { WalletList } from "./components/modal/wallet-list"
export { AccountSelect } from "./components/modal/account-select"
export { ExternalWalletForm } from "./components/modal/external-wallet-form"
export { AccountAvatar } from "./components/ui/account-avatar"
export { Web3Provider } from "./components/providers/web3-provider"

// Hooks
export { useAccount } from "./hooks/use-account"
export { useConnect } from "./hooks/use-connect"
export { useDisconnect } from "./hooks/use-disconnect"
export { useWalletAccounts } from "./hooks/use-accounts"

// Store
export { useWeb3Store } from "./store/use-web3-store"

// Types
export type {
  Account,
  WalletProvider,
  WalletProviderEntry,
  Web3State,
  PolkadotNamespaceChainId,
} from "./types/web3"
export { WalletProviderType, WalletProviderStatus } from "./types/web3"

// Wallets
export { getSupportedWallets, getWalletByType } from "./wallets"
export { ExternalWallet } from "./wallets/external-wallet"
export { NovaWallet } from "./wallets/nova-wallet"

// Utils
export { shortenAddress } from "./utils/format"
export { toGenericSubstrateAddress } from "./utils/address"

// Constants
export { POLKADOT_APP_NAME, POLKADOT_CAIP_ID_MAP, POLKADOT_CHAIN_IDS } from "./constants/chains"
export { SUPPORTED_WALLETS, WALLET_INFO } from "./constants/wallets"
