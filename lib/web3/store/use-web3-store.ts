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
