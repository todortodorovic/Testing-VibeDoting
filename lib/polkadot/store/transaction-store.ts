import { create } from "zustand"
import { TransactionInfo } from "../types/transaction-tracker"

interface TransactionStore {
  currentTransaction: TransactionInfo | null
  setCurrentTransaction: (tx: TransactionInfo) => void
  updateCurrentTransaction: (updates: Partial<TransactionInfo>) => void
  clearCurrentTransaction: () => void
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  currentTransaction: null,

  setCurrentTransaction: (tx) => {
    set({ currentTransaction: tx })
  },

  updateCurrentTransaction: (updates) => {
    set((state) => {
      if (!state.currentTransaction) return state
      return {
        currentTransaction: { ...state.currentTransaction, ...updates },
      }
    })
  },

  clearCurrentTransaction: () => {
    set({ currentTransaction: null })
  },
}))
