import { getWallets, Wallet } from "@talismn/connect-wallets"
import { WalletProvider, WalletProviderType } from "@/lib/web3/types/web3"
import { SUPPORTED_WALLETS } from "@/lib/web3/constants/wallets"
import { ExternalWallet } from "./external-wallet"
import { NovaWallet } from "./nova-wallet"

const baseWallets = getWallets()
const externalWallet = new ExternalWallet()
const novaWallet = new NovaWallet()

function normalizeProviderType(wallet: Wallet): WalletProviderType {
  if (wallet instanceof NovaWallet) {
    return WalletProviderType.NovaWallet
  }
  return wallet.extensionName as WalletProviderType
}

const uniqueWallets = [
  ...baseWallets
    .filter(wallet => wallet.title !== 'Nova Wallet')
    .map(wallet => ({
      wallet,
      type: normalizeProviderType(wallet),
    }))
    .filter(w => SUPPORTED_WALLETS.includes(w.type)),
  ...(SUPPORTED_WALLETS.includes(WalletProviderType.NovaWallet) ? [{
    wallet: novaWallet,
    type: WalletProviderType.NovaWallet,
  }] : []),
]

export const SUPPORTED_WALLET_PROVIDERS: WalletProvider[] = [
  ...uniqueWallets,
  ...(SUPPORTED_WALLETS.includes(WalletProviderType.ExternalWallet) ? [{
    wallet: externalWallet,
    type: WalletProviderType.ExternalWallet,
  }] : []),
]

export function getSupportedWallets() {
  return SUPPORTED_WALLET_PROVIDERS
}

export function getWalletByType(
  type?: WalletProviderType | null
): WalletProvider | null {
  if (!type) return null
  return (
    SUPPORTED_WALLET_PROVIDERS.find((provider) => provider.type === type) || null
  )
}
