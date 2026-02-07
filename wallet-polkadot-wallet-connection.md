# Polkadot Wallet Connection - Complete Implementation

Complete multi-wallet connection system for Polkadot/Substrate ecosystem with Zustand, React Query, and full TypeScript support. Includes Polkadot.js, Talisman, Nova Wallet, SubWallet, and External Wallet (read-only) support.

---

# Polkadot Wallet Connection - Complete Implementation

## 📋 Overview

This documentation describes a **complete wallet connection system** for the Polkadot/Substrate ecosystem. The system supports all major Polkadot wallets, including an "External Wallet" option for read-only access.

### 🎯 Key Features

- ✅ **Multi-wallet support**: Polkadot.js, Talisman, Nova Wallet, SubWallet, WalletConnect
- ✅ **External Wallet**: Read-only mode for any Substrate address
- ✅ **Zustand store**: Centralized state management with persistence
- ✅ **React Query**: Optimized data fetching
- ✅ **Modal interface**: Better UX with multi-step process
- ✅ **SS58 Address handling**: Automatic conversion between different chain formats
- ✅ **Account dropdown**: Display current account with copy/disconnect options
- ✅ **TypeScript**: Full type safety

---

## 📦 Dependencies

Add the following to your `package.json`:

```json
{
  "dependencies": {
    "@polkadot/api": "^16.4.9",
    "@polkadot/util-crypto": "^13.5.6",
    "@talismn/connect-wallets": "^1.2.8",
    "@tanstack/react-query": "^5.90.2",
    "zustand": "^5.0.8",
    "next": "^16.0.10",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "lucide-react": "^0.552.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1"
  }
}
```

**IMPORTANT**: This assumes Next.js 14+ with App Router, TypeScript, and Tailwind CSS.

---

## 🗂️ File Structure

```
lib/web3/
├── components/
│   ├── button/
│   │   ├── web3-connect-button.tsx
│   │   └── account-dropdown.tsx
│   ├── modal/
│   │   ├── web3-connect-modal.tsx
│   │   ├── wallet-list.tsx
│   │   ├── account-select.tsx
│   │   └── external-wallet-form.tsx
│   ├── providers/
│   │   └── web3-provider.tsx
│   └── ui/
│       ├── account-avatar.tsx
│       ├── polkadot-avatar.tsx
│       └── talisman-avatar.tsx
├── constants/
│   ├── chains.ts
│   └── wallets.ts
├── hooks/
│   ├── use-account.ts
│   ├── use-accounts.ts
│   ├── use-connect.ts
│   ├── use-disconnect.ts
│   └── use-wallet.ts
├── store/
│   └── use-web3-store.ts
├── types/
│   └── web3.ts
├── utils/
│   ├── address.ts
│   ├── format.ts
│   └── validation.ts
├── wallets/
│   ├── index.ts
│   ├── external-wallet.ts
│   └── nova-wallet.ts
└── index.ts
```

---

## 📝 Implementation - File by File

### 1. Types (`lib/web3/types/web3.ts`)

```typescript
import { Wallet, WalletAccount } from "@talismn/connect-wallets"

export enum WalletProviderType {
  PolkadotJS = "polkadot-js",
  Talisman = "talisman",
  SubwalletJS = "subwallet-js",
  NovaWallet = "nova-wallet",
  WalletConnect = "walletconnect",
  ExternalWallet = "external",
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
```

---

### 2. Store (`lib/web3/store/use-web3-store.ts`)

```typescript
import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  Account,
  WalletProviderType,
  WalletProviderStatus,
  WalletProviderEntry,
  Web3State,
} from "@/lib/web3/types/web3"

interface Web3Store extends Web3State {
  toggle: () => void
  setAccount: (account: Account | null) => void
  setStatus: (
    provider: WalletProviderType | null,
    status: WalletProviderStatus
  ) => void
  getStatus: (provider: WalletProviderType | null) => WalletProviderStatus
  getConnectedProviders: () => WalletProviderEntry[]
  setError: (error: string) => void
  disconnect: (provider?: WalletProviderType) => void
}

const initialState: Web3State = {
  open: false,
  providers: [],
  recentProvider: null,
  account: null,
  error: "",
}

export const useWeb3Store = create<Web3Store>()(
  persist(
    (set, get) => ({
      ...initialState,
      toggle: () =>
        set((state) => ({
          ...state,
          open: !state.open,
        })),
      setAccount: (account) => set((state) => ({ ...state, account })),
      setStatus: (provider, status) => {
        const isError = status === WalletProviderStatus.Error
        return set((state) => ({
          ...state,
          providers: provider
            ? [
                ...state.providers.filter((p) => p.type !== provider),
                { type: provider, status },
              ]
            : state.providers,
          recentProvider: provider,
          account: isError ? null : state.account,
          error: isError ? state.error : "",
        }))
      },
      getStatus: (provider) => {
        const foundProvider = get().providers.find((p) => p.type === provider)
        return foundProvider?.status ?? WalletProviderStatus.Disconnected
      },
      getConnectedProviders: () => {
        const { providers } = get()
        return providers.filter((p) => p.status === WalletProviderStatus.Connected)
      },
      setError: (error) => set((state) => ({ ...state, error })),
      disconnect: (provider) => {
        set((state) => ({
          ...state,
          ...initialState,
          account:
            !provider || provider === state.account?.provider
              ? null
              : state.account,
          providers: provider
            ? state.providers.filter((p) => p.type !== provider)
            : [],
          recentProvider: null,
          open: state.open,
        }))
      },
    }),
    {
      name: "web3-connect",
      partialize: (state) => ({
        providers: state.providers,
        account: state.account,
        recentProvider: state.recentProvider,
      }),
    }
  )
)
```

---

### 3. Constants - Chains (`lib/web3/constants/chains.ts`)

```typescript
import { PolkadotNamespaceChainId } from "@/lib/web3/types/web3"

export const POLKADOT_APP_NAME = "T3rminal"

export const POLKADOT_CAIP_ID_MAP: Record<string, PolkadotNamespaceChainId> = {
  polkadot: "polkadot:91b171bb158e2d3848fa23a9f1c25182",
  kusama: "polkadot:b0a8d493285c2df73290dfb7e61f870f",
  westend: "polkadot:e143f23803ac50e8f6f8e62695d1ce9e",
  paseo: "polkadot:77afd6190f1554ad45fd0d31aee62aac", // Paseo testnet
}

export const POLKADOT_CHAIN_IDS = Object.values(POLKADOT_CAIP_ID_MAP)

// SS58 Format for different chains
export const SS58_FORMAT = {
  polkadot: 0,  // Polkadot addresses start with 1
  kusama: 2,    // Kusama addresses start with C-H
  westend: 42,  // Westend addresses start with 5
  paseo: 42,    // Paseo addresses start with 5 (same as Westend/generic)
  generic: 42,  // Generic Substrate addresses start with 5
}
```

---

### 4. Constants - Wallets (`lib/web3/constants/wallets.ts`)

```typescript
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
}
```

---

### 5. Wallet Implementations - External Wallet (`lib/web3/wallets/external-wallet.ts`)

```typescript
import { Wallet, WalletAccount } from "@talismn/connect-wallets"
import { WalletProviderType } from "@/lib/web3/types/web3"

/**
 * Mock Wallet for "View as Wallet" functionality (read-only)
 */
export class ExternalWallet implements Wallet {
  extensionName = WalletProviderType.ExternalWallet
  title = "External Wallet"
  installUrl = ""
  logo = {
    src: "",
    alt: "External Wallet",
  }

  _extension: unknown
  _signer: unknown
  account: WalletAccount | undefined

  get extension() {
    return this._extension
  }

  get signer() {
    return this._signer
  }

  get installed() {
    return true
  }

  transformError = (err: Error): Error => {
    return err
  }

  enable = async (dappName: string) => {
    this._extension = {}
    return Promise.resolve(dappName)
  }

  setAddress = async (address?: string) => {
    if (address) {
      if (!this._extension) this._extension = {}
      this.account = {
        address,
        source: this.extensionName,
        name: "External Account",
        wallet: this,
        signer: this.signer,
      }
    } else {
      this.account = undefined
    }
  }

  getAccounts = async (): Promise<WalletAccount[]> => {
    return Promise.resolve(this.account ? [this.account] : [])
  }

  subscribeAccounts = async () => Promise.resolve()
}
```

---

### 6. Wallet Implementations - Nova Wallet (`lib/web3/wallets/nova-wallet.ts`)

```typescript
import { BaseDotsamaWallet } from "@talismn/connect-wallets"
import { WalletProviderType } from "@/lib/web3/types/web3"

declare global {
  interface Window {
    injectedWeb3?: Record<string, unknown>
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
```

---

### 7. Wallet Implementations - Index (`lib/web3/wallets/index.ts`)

```typescript
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
```

---

### 8. Utils - Address (`lib/web3/utils/address.ts`)

```typescript
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto"

/**
 * Convert address to SS58 format with specific prefix
 */
export function toSS58(address: string, prefix = 42): string | null {
  try {
    return encodeAddress(decodeAddress(address), prefix)
  } catch {
    return null
  }
}

/**
 * Validate if string is a valid Substrate address
 */
export function isValidSubstrateAddress(address: string): boolean {
  try {
    decodeAddress(address)
    return true
  } catch {
    return false
  }
}

/**
 * Get generic substrate address (prefix 42)
 * Paseo uses prefix 42 (same as generic Substrate)
 */
export function toGenericSubstrateAddress(address: string): string | null {
  return toSS58(address, 42)
}

/**
 * Get Paseo-formatted address (prefix 42)
 */
export function toPaseoAddress(address: string): string | null {
  return toSS58(address, 42)
}
```

---

### 9. Utils - Format (`lib/web3/utils/format.ts`)

```typescript
/**
 * Shorten address for display (e.g., "5GrwvaEF...92RXq")
 */
export function shortenAddress(
  address: string,
  startChars = 6,
  endChars = 4
): string {
  if (!address) return ""
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Format account name with optional address
 */
export function formatAccountName(
  name: string | undefined,
  address: string,
  showAddress = true
): string {
  if (!name) return shortenAddress(address)
  if (!showAddress) return name
  return `${name} (${shortenAddress(address)})`
}
```

---

### 10. Utils - Validation (`lib/web3/utils/validation.ts`)

```typescript
import { isValidSubstrateAddress } from "./address"

export function validateAddress(address: string): {
  isValid: boolean
  error?: string
} {
  if (!address) {
    return { isValid: false, error: "Address is required" }
  }

  if (!isValidSubstrateAddress(address)) {
    return { isValid: false, error: "Invalid Substrate address" }
  }

  return { isValid: true }
}
```

---

### 11. Hooks - use-account (`lib/web3/hooks/use-account.ts`)

```typescript
import { useWeb3Store } from "../store/use-web3-store"

export function useAccount() {
  const account = useWeb3Store((state) => state.account)
  return { account }
}
```

---

### 12. Hooks - use-accounts (`lib/web3/hooks/use-accounts.ts`)

```typescript
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
```

---

### 13. Hooks - use-connect (`lib/web3/hooks/use-connect.ts`)

```typescript
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
```

---

### 14. Hooks - use-disconnect (`lib/web3/hooks/use-disconnect.ts`)

```typescript
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
```

---

### 15. Hooks - use-wallet (`lib/web3/hooks/use-wallet.ts`)

```typescript
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
```

---

### 16. Components - Web3 Connect Button (`lib/web3/components/button/web3-connect-button.tsx`)

```typescript
"use client"

import { useAccount } from "@/lib/web3/hooks/use-account"
import { useWeb3Store } from "@/lib/web3/store/use-web3-store"
import { AccountDropdown } from "./account-dropdown"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Web3ConnectButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
}

export function Web3ConnectButton({ className, variant = "default" }: Web3ConnectButtonProps) {
  const { account } = useAccount()
  const { toggle } = useWeb3Store()

  if (account) {
    return <AccountDropdown account={account} className={className} />
  }

  return (
    <Button onClick={toggle} variant={variant} className={cn("gap-2", className)}>
      <Wallet className="h-5 w-5" />
      <span className="font-medium">Connect Wallet</span>
    </Button>
  )
}
```

---

### 17. Components - Account Dropdown (`lib/web3/components/button/account-dropdown.tsx`)

```typescript
"use client"

import { Account } from "@/lib/web3/types/web3"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { shortenAddress } from "@/lib/web3/utils/format"
import { useDisconnect } from "@/lib/web3/hooks/use-disconnect"
import { LogOut, Copy, Check, ChevronsUpDown } from "lucide-react"
import { useState } from "react"
import { AccountAvatar } from "@/lib/web3/components/ui/account-avatar"
import { cn } from "@/lib/utils"

interface AccountDropdownProps {
  account: Account
  className?: string
}

export function AccountDropdown({ account, className }: AccountDropdownProps) {
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(account.displayAddress || account.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
            className
          )}
        >
          <AccountAvatar
            address={account.address}
            size={32}
            className="rounded-lg"
            provider={account.provider}
          />
          <div className="flex flex-col items-start text-left">
            <span className="truncate font-medium text-sm">{account.name}</span>
            <span className="truncate text-xs font-mono text-muted-foreground">
              {shortenAddress(account.displayAddress || account.address)}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <AccountAvatar
              address={account.address}
              size={32}
              className="rounded-lg"
              provider={account.provider}
            />
            <div className="flex flex-col">
              <span className="truncate font-medium">{account.name}</span>
              <span className="truncate text-xs font-mono text-muted-foreground">
                {shortenAddress(account.displayAddress || account.address)}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied!" : "Copy Address"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()} className="text-red-600">
          <LogOut />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

### 18. Components - Web3 Connect Modal (`lib/web3/components/modal/web3-connect-modal.tsx`)

```typescript
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWeb3Store } from "@/lib/web3/store/use-web3-store"
import { WalletProviderType } from "@/lib/web3/types/web3"
import { useConnect } from "@/lib/web3/hooks/use-connect"
import { useWalletAccounts } from "@/lib/web3/hooks/use-accounts"
import { WalletList } from "./wallet-list"
import { AccountSelect } from "./account-select"
import { ExternalWalletForm } from "./external-wallet-form"
import { getWalletByType } from "@/lib/web3/wallets"
import { ExternalWallet } from "@/lib/web3/wallets/external-wallet"
import { ArrowLeft } from "lucide-react"
import { toGenericSubstrateAddress } from "@/lib/web3/utils/address"

type ModalStep = "wallet-select" | "account-select" | "external-form"

export function Web3ConnectModal() {
  const { open, toggle, setAccount } = useWeb3Store()
  const [step, setStep] = useState<ModalStep>("wallet-select")
  const [selectedWallet, setSelectedWallet] =
    useState<WalletProviderType | null>(null)

  const { mutate: connect } = useConnect()
  const { data: accounts = [], isLoading } = useWalletAccounts(selectedWallet)

  const handleSelectWallet = (type: WalletProviderType) => {
    if (type === WalletProviderType.ExternalWallet) {
      setSelectedWallet(type)
      setStep("external-form")
      return
    }

    setSelectedWallet(type)
    connect(type, {
      onSuccess: () => {
        setStep("account-select")
      },
    })
  }

  const handleSelectAccount = (account: typeof accounts[0]) => {
    setAccount(account)
    handleClose()
  }

  const handleExternalSubmit = async (address: string) => {
    const provider = getWalletByType(WalletProviderType.ExternalWallet)
    if (provider?.wallet instanceof ExternalWallet) {
      await provider.wallet.setAddress(address)
      const genericAddress = toGenericSubstrateAddress(address)
      setAccount({
        name: "External Account",
        address,
        displayAddress: genericAddress || address,
        provider: WalletProviderType.ExternalWallet,
        isExternalWalletConnected: true,
      })
      handleClose()
    }
  }

  const handleBack = () => {
    setStep("wallet-select")
    setSelectedWallet(null)
  }

  const handleClose = () => {
    toggle()
    setTimeout(() => {
      setStep("wallet-select")
      setSelectedWallet(null)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="relative">
          {step !== "wallet-select" && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute -left-2 -top-1 h-8 w-8"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <DialogTitle className="text-center uppercase tracking-wide text-sm">
            {step === "wallet-select" && "Connect Wallet"}
            {step === "account-select" && "Select Account"}
            {step === "external-form" && "External Wallet"}
          </DialogTitle>
          {step === "wallet-select" && (
            <DialogDescription className="text-center text-xs">
              Choose a wallet to connect to this application
            </DialogDescription>
          )}
          {step === "account-select" && (
            <DialogDescription className="text-center text-xs">
              Select an account from your wallet
            </DialogDescription>
          )}
          {step === "external-form" && (
            <DialogDescription className="text-center text-xs">
              Enter a Substrate address to view (read-only)
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-4">
          {step === "wallet-select" && (
            <WalletList onSelectWallet={handleSelectWallet} />
          )}

          {step === "account-select" && (
            <AccountSelect
              accounts={accounts}
              isLoading={isLoading}
              onSelectAccount={handleSelectAccount}
            />
          )}

          {step === "external-form" && (
            <ExternalWalletForm onSubmit={handleExternalSubmit} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

### 19. Components - Wallet List (`lib/web3/components/modal/wallet-list.tsx`)

```typescript
"use client"

import { useState } from "react"
import { WalletProviderType } from "@/lib/web3/types/web3"
import { WALLET_INFO } from "@/lib/web3/constants/wallets"
import { getSupportedWallets } from "@/lib/web3/wallets"
import { Download, ChevronRight, Eye, ChevronDown } from "lucide-react"

interface WalletListProps {
  onSelectWallet: (type: WalletProviderType) => void
}

export function WalletList({ onSelectWallet }: WalletListProps) {
  const [showOthers, setShowOthers] = useState(false)

  const wallets = getSupportedWallets()

  const { installed, notInstalled } = wallets.reduce<{
    installed: typeof wallets
    notInstalled: typeof wallets
  }>(
    (acc, wallet) => {
      if (wallet.wallet.installed || wallet.type === WalletProviderType.ExternalWallet) {
        acc.installed.push(wallet)
      } else {
        acc.notInstalled.push(wallet)
      }
      return acc
    },
    { installed: [], notInstalled: [] }
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-3">Installed</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {installed.map(({ wallet, type }) => {
            const info = WALLET_INFO[type]
            const isExternal = type === WalletProviderType.ExternalWallet

            return (
              <button
                key={type}
                onClick={() => onSelectWallet(type)}
                className="relative flex flex-col items-center gap-2 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors group"
              >
                {isExternal ? (
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-blue-400" />
                  </div>
                ) : wallet.logo?.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={wallet.logo.src}
                    alt={wallet.logo.alt}
                    className="h-12 w-12"
                  />
                ) : null}
                <p className="text-xs text-center font-medium">{info?.name || wallet.title}</p>
                <p className="text-xs text-blue-400 flex items-center gap-1">
                  Continue
                  <ChevronRight className="h-3 w-3" />
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {notInstalled.length > 0 && (
        <div>
          <div className="border-t border-border mb-4" />

          <button
            onClick={() => setShowOthers(!showOthers)}
            className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <span>Other</span>
            <span className="flex items-center gap-1">
              {showOthers ? "Hide" : "Show"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showOthers ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          {showOthers && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {notInstalled.map(({ wallet, type }) => {
                const info = WALLET_INFO[type]
                const downloadUrl = info?.downloadUrl || wallet.installUrl

                return (
                  <button
                    key={type}
                    onClick={() => {
                      if (downloadUrl) {
                        window.open(downloadUrl, "_blank", "noopener,noreferrer")
                      }
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    {wallet.logo?.src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={wallet.logo.src}
                        alt={wallet.logo.alt}
                        className="h-12 w-12 opacity-70"
                      />
                    )}
                    <p className="text-xs text-center font-medium">{info?.name || wallet.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Download
                      <Download className="h-3 w-3" />
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

### 20. Components - Account Select (`lib/web3/components/modal/account-select.tsx`)

```typescript
"use client"

import { Account } from "@/lib/web3/types/web3"
import { shortenAddress } from "@/lib/web3/utils/format"
import { Check } from "lucide-react"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { cn } from "@/lib/utils"
import { AccountAvatar } from "@/lib/web3/components/ui/account-avatar"

interface AccountSelectProps {
  accounts: Account[]
  isLoading: boolean
  onSelectAccount: (account: Account) => void
}

export function AccountSelect({
  accounts,
  isLoading,
  onSelectAccount,
}: AccountSelectProps) {
  const { account: currentAccount } = useAccount()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-secondary/50 animate-pulse"
          >
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No accounts found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
      {accounts.map((account) => {
        const isSelected =
          currentAccount?.address === account.address &&
          currentAccount?.provider === account.provider

        return (
          <button
            key={`${account.provider}-${account.address}`}
            onClick={() => onSelectAccount(account)}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-lg border transition-all",
              isSelected
                ? "border-blue-500 bg-blue-500/10"
                : "border-border bg-secondary/30 hover:bg-secondary/60"
            )}
          >
            <AccountAvatar
              address={account.address}
              size={40}
              provider={account.provider}
            />
            <div className="text-left flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {account.name || "Unnamed Account"}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {shortenAddress(account.displayAddress || account.address, 8, 6)}
              </div>
            </div>
            {isSelected && (
              <Check className="h-4 w-4 text-blue-500 shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}
```

---

### 21. Components - External Wallet Form (`lib/web3/components/modal/external-wallet-form.tsx`)

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { validateAddress } from "@/lib/web3/utils/validation"

interface ExternalWalletFormProps {
  onSubmit: (address: string) => void
}

export function ExternalWalletForm({ onSubmit }: ExternalWalletFormProps) {
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string>()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validation = validateAddress(address)

    if (!validation.isValid) {
      setError(validation.error)
      return
    }

    setError(undefined)
    onSubmit(address)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="address"
          className="block text-sm font-medium mb-2"
        >
          Substrate Address
        </label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
          className="w-full px-3 py-2 border rounded-md font-mono text-sm"
        />
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </div>
      <Button type="submit" className="w-full">
        View Address
      </Button>
    </form>
  )
}
```

---

### 22. Components - Web3 Provider (`lib/web3/components/providers/web3-provider.tsx`)

```typescript
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Web3ConnectModal } from "../modal/web3-connect-modal"

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Web3ConnectModal />
    </QueryClientProvider>
  )
}
```

---

### 23. Components - Account Avatar (Simple Version)

**Note**: If you don't have specialized avatars (PolkadotAvatar, TalismanAvatar), use this generic version:

```typescript
// lib/web3/components/ui/account-avatar.tsx
"use client"

import { WalletProviderType } from "@/lib/web3/types/web3"
import { cn } from "@/lib/utils"

interface AccountAvatarProps {
  address: string
  size?: number
  className?: string
  provider?: WalletProviderType
}

export function AccountAvatar({
  address,
  size = 40,
  className,
  provider,
}: AccountAvatarProps) {
  // Simple gradient avatar based on address
  const colors = [
    "from-blue-500 to-purple-500",
    "from-green-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
  ]

  const colorIndex = address.charCodeAt(0) % colors.length
  const gradientClass = colors[colorIndex]

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold",
        gradientClass,
        className
      )}
      style={{ width: size, height: size, fontSize: size / 3 }}
    >
      {address.slice(0, 2).toUpperCase()}
    </div>
  )
}
```

---

### 24. Main Export (`lib/web3/index.ts`)

```typescript
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
```

---

## 🚀 How to Use

### 1. Wrap App with Web3Provider

In your root layout (`app/layout.tsx`):

```typescript
import { Web3Provider } from "@/lib/web3"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  )
}
```

### 2. Add Connect Button

In any component:

```typescript
import { Web3ConnectButton } from "@/lib/web3"

export function Header() {
  return (
    <header>
      <nav>
        <Web3ConnectButton />
      </nav>
    </header>
  )
}
```

### 3. Use Account in Component

```typescript
import { useAccount } from "@/lib/web3"

export function MyComponent() {
  const { account } = useAccount()

  if (!account) {
    return <p>Please connect your wallet</p>
  }

  return (
    <div>
      <p>Connected as: {account.name}</p>
      <p>Address: {account.address}</p>
    </div>
  )
}
```

### 4. Programmatic Connect/Disconnect

```typescript
import { useConnect, useDisconnect, WalletProviderType } from "@/lib/web3"

export function WalletManager() {
  const { mutate: connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <div>
      <button
        onClick={() => connect(WalletProviderType.Talisman)}
        disabled={isPending}
      >
        Connect Talisman
      </button>
      <button onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  )
}
```

---

## 🎨 Tailwind & Shadcn/ui

This implementation uses **Tailwind CSS** and **Radix UI** (via Shadcn/ui). If you don't have Shadcn/ui setup:

1. Install: `npx shadcn@latest init`
2. Add components: `npx shadcn@latest add button dialog dropdown-menu`

Alternatively, you can replace Shadcn components with your own.

---

## 🔧 Customization

### Change Supported Wallets

Edit `lib/web3/constants/wallets.ts`:

```typescript
export const SUPPORTED_WALLETS: WalletProviderType[] = [
  WalletProviderType.Talisman,  // Only Talisman
]
```

### Change App Name

Edit `lib/web3/constants/chains.ts`:

```typescript
export const POLKADOT_APP_NAME = "Your App Name"
```

### Change SS58 Format

Edit `lib/web3/utils/address.ts` and change the default prefix:

```typescript
// For Polkadot (prefix 0)
export function toPolkadotAddress(address: string): string | null {
  return toSS58(address, 0)
}
```

---

## ✅ Testing

Check if everything works:

1. ✅ Open app in browser
2. ✅ Click "Connect Wallet"
3. ✅ Modal should open
4. ✅ See list of installed wallets
5. ✅ Click on wallet (e.g., Talisman)
6. ✅ Browser extension popup asks for approval
7. ✅ Approve connection
8. ✅ See list of accounts from wallet
9. ✅ Select account
10. ✅ Button changes to AccountDropdown
11. ✅ Click dropdown - see Copy Address and Disconnect
12. ✅ Click Disconnect - wallet disconnects

---

## 🐛 Common Issues

### Issue: "Cannot find module '@/components/ui/button'"

**Solution**: Install Shadcn components or create a custom Button component.

### Issue: "wallet.installed is false"

**Solution**: Install wallet extension in browser.

### Issue: "Account persists after page refresh"

**Solution**: This is expected - Zustand persist middleware saves account in localStorage.

### Issue: "Wrong address format"

**Solution**: Check SS58 prefix in `lib/web3/utils/address.ts`.

---

## 📚 Additional Resources

- [Polkadot.js Docs](https://polkadot.js.org/docs/)
- [Talisman Connect Docs](https://docs.talisman.xyz/talisman-connect)
- [Substrate Addresses](https://wiki.polkadot.network/docs/learn-accounts)
- [SS58 Format](https://docs.substrate.io/reference/address-formats/)

---

## 🎉 Done!

You now have a complete wallet connection implementation that you can copy-paste into any Polkadot/Substrate project!

**IMPORTANT**: Customize colors, styling, and app name according to your project needs.
