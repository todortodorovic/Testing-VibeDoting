# Polkadot Transaction Status Tracker

Real-time transaction lifecycle tracking for Polkadot/Substrate using **Polkadot API (PAPI)**. Tracks a single current transaction via Zustand store with console logging, block confirmations, and error detection.

**Prerequisites:** Working Asset Transfer System (see `POLKADOT_ASSET_TRANSFER_IMPLEMENTATION copy.md`), Next.js 16+, TypeScript, Zustand already installed.

**No additional dependencies required** — uses only what the Asset Transfer System already provides (`polkadot-api`, `@tanstack/react-query`, `zustand`, `lucide-react`).

---

## Architecture

### Why Zustand instead of React Query?

React Query is designed for **server state** (fetching, caching, invalidation). Transaction tracking is **local ephemeral UI state** — it starts when a user clicks "Send", updates in real-time via an observable subscription, and resets on the next transfer. Zustand is the right fit because:

- The store updates come from an observable callback inside `useMutation`, not from a fetch
- Multiple components (TransferForm, TransactionTracker) need to read the same transaction state
- `useTransactionStore.getState()` lets us read the latest state inside async callbacks without stale closures

### `"use client"` directive

Hook files that call React hooks (`useState`, `useEffect`) or Zustand hooks need `"use client"` in Next.js App Router. Pure type files and utility classes (no hooks) do **not** need it. The store file also does not need it because `create()` from Zustand is not a React hook — it's a store factory.

### Single transaction model

The store holds one `currentTransaction`. Each new transfer replaces the previous one. There is no transaction history or ID system — the tracker component simply renders whatever is in the store, or renders nothing if the store is empty.

---

## PAPI Observable — Critical Gotchas

These are easy to get wrong. Read before implementing.

**1. `signSubmitAndWatch` returns an observable, not a promise.**
It emits events over time. You must `.subscribe()` and handle events in the `next` callback.

**2. The observable emits exactly these event types:**
- `"broadcasted"` — transaction sent to network (no txHash yet on some chains)
- `"txBestBlocksState"` — transaction found/not-found in best block. Check `event.found` before reading `event.block`
- `"finalized"` — transaction is finalized with `event.txHash`, `event.block.hash`, `event.block.number`

**3. There is NO `"invalid"` event.** Invalid/rejected transactions come through the `error` callback, not `next`. Do not write `if (event.type === "invalid")`.

**4. `subscribe()` returns a `Subscription` object.** Call `subscription.unsubscribe()`. Do NOT call it as a function — `const unsub = observable.subscribe(...)` then `unsub()` will NOT work.

**5. Reading store state inside async callbacks:** The `txStore` variable from the hook closure may be stale by the time observable events fire. Use `useTransactionStore.getState().currentTransaction` to read the latest state inside `next` and `error` callbacks.

---

## Transaction Lifecycle

```
Preparing → Signing → Broadcasting → Broadcasted → InBlock → Finalized
                ↓              ↓                              ↓
           Cancelled        Failed                         Failed
         (user rejected)  (network/RPC error)          (error callback)
```

Every status in the enum is actually set somewhere in the code. There are no unused statuses.

---

## File Structure

```
lib/polkadot/
├── types/
│   └── transaction-tracker.ts    ← CREATE (new file)
├── utils/
│   └── transaction-logger.ts     ← CREATE (new file)
├── store/
│   └── transaction-store.ts      ← CREATE (new file, new directory)
├── hooks/
│   ├── use-transfer.ts           ← MODIFY (replace existing with tracking version)
│   └── use-transaction-tracker.ts ← CREATE (new file)
└── components/
    └── transaction-tracker.tsx   ← CREATE (new file)

app/transfer/
└── page.tsx                      ← MODIFY (add TransactionTracker component)
```

---

## Implementation

### 1. Types — `lib/polkadot/types/transaction-tracker.ts` (CREATE)

Every enum value maps to a status that is actually set in `use-transfer.ts`. The `TransactionEvent.type` union matches exactly what PAPI's `signSubmitAndWatch` observable emits.

```typescript
export enum TransactionStatus {
  // Initial states
  Preparing = "preparing",
  Signing = "signing",

  // Broadcast states
  Broadcasting = "broadcasting",
  Broadcasted = "broadcasted",

  // Block states
  InBlock = "in-block",
  Finalized = "finalized",

  // Error states
  Failed = "failed",

  // User actions
  Cancelled = "cancelled",
}

export interface TransactionEvent {
  type: "broadcasted" | "txBestBlocksState" | "finalized"
  timestamp: number
  blockHash?: string
  blockNumber?: number
  txHash?: string
}

export interface TransactionInfo {
  txHash?: string
  status: TransactionStatus
  blockHash?: string
  blockNumber?: number
  confirmations: number
  events: TransactionEvent[]
  error?: string
  timestamp: number
  fromAddress: string
  toAddress: string
  amount: bigint
  fee?: bigint
}
```

---

### 2. Transaction Logger — `lib/polkadot/utils/transaction-logger.ts` (CREATE)

Console logging utility. No `"use client"` needed — this is a plain class with no React hooks.

**Logging responsibility is split:**
- **Transfer hook** calls `preparing()`, `signing()`, `broadcasting()` directly (early stages before the observable)
- **Tracker hook** calls `broadcasted()`, `inBlock()`, `finalized()`, `error()`, `cancelled()` reactively (when store state changes)

This avoids duplicate logs.

```typescript
import { TransactionStatus, TransactionEvent, TransactionInfo } from "../types/transaction-tracker"

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Status colors
  info: "\x1b[36m",      // Cyan
  success: "\x1b[32m",   // Green
  warning: "\x1b[33m",   // Yellow
  error: "\x1b[31m",     // Red

  // Specific colors
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
}

export class TransactionLogger {
  private enabled: boolean

  constructor(enabled = true) {
    this.enabled = enabled
  }

  private log(color: string, icon: string, title: string, data?: Record<string, any>) {
    if (!this.enabled) return

    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1)

    console.log(
      `\n${color}${COLORS.bright}${icon} ${title}${COLORS.reset}`
    )
    console.log(`${COLORS.dim}${timestamp}${COLORS.reset}`)

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        console.log(`  ${COLORS.dim}${key}:${COLORS.reset}`, value)
      })
    }
    console.log("")
  }

  preparing(fromAddress: string, toAddress: string, amount: string) {
    this.log(COLORS.info, "⚙️", "Preparing Transaction", {
      From: fromAddress,
      To: toAddress,
      Amount: amount,
    })
  }

  signing() {
    this.log(COLORS.warning, "✍️", "Awaiting Signature", {
      Status: "Wallet popup opened",
      Action: "Please approve in your wallet",
    })
  }

  broadcasting() {
    this.log(COLORS.info, "📡", "Broadcasting Transaction", {
      Status: "Submitting to network",
    })
  }

  broadcasted(txHash: string) {
    this.log(COLORS.success, "✅", "Transaction Broadcasted", {
      "Transaction Hash": txHash,
      Status: "Waiting for block inclusion",
    })
  }

  inBlock(txHash: string, blockHash: string, blockNumber: number) {
    this.log(COLORS.blue, "📦", "Transaction In Block", {
      "Transaction Hash": txHash,
      "Block Hash": blockHash,
      "Block Number": `#${blockNumber}`,
      Confirmations: 1,
      Status: "Waiting for finalization",
    })
  }

  finalized(txHash: string, blockHash: string, blockNumber: number, confirmations: number) {
    this.log(COLORS.success, "🎉", "Transaction Finalized", {
      "Transaction Hash": txHash,
      "Block Hash": blockHash,
      "Block Number": `#${blockNumber}`,
      Confirmations: confirmations,
      Status: "✓ Complete",
    })
  }

  error(error: Error | string) {
    this.log(COLORS.error, "💥", "Transaction Error", {
      Error: typeof error === "string" ? error : error.message,
      Stack: typeof error === "object" ? error.stack : undefined,
    })
  }

  cancelled() {
    this.log(COLORS.warning, "🚫", "Transaction Cancelled", {
      Reason: "User cancelled in wallet",
    })
  }

  summary(tx: TransactionInfo) {
    console.group(
      `${COLORS.bright}${COLORS.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`
    )
    console.log(`${COLORS.bright}Transaction Summary${COLORS.reset}`)
    console.log("")
    console.log("Status:", this.getStatusEmoji(tx.status), tx.status)
    if (tx.txHash) console.log("Hash:", tx.txHash)
    if (tx.blockHash) console.log("Block Hash:", tx.blockHash)
    if (tx.blockNumber) console.log("Block Number:", `#${tx.blockNumber}`)
    console.log("Confirmations:", tx.confirmations)
    console.log("Events:", tx.events.length)
    console.log("Duration:", `${Date.now() - tx.timestamp}ms`)
    if (tx.error) console.log(`${COLORS.error}Error:${COLORS.reset}`, tx.error)
    console.groupEnd()
    console.log(
      `${COLORS.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`
    )
  }

  private getStatusEmoji(status: TransactionStatus): string {
    switch (status) {
      case TransactionStatus.Preparing:
        return "⚙️"
      case TransactionStatus.Signing:
        return "✍️"
      case TransactionStatus.Broadcasting:
      case TransactionStatus.Broadcasted:
        return "📡"
      case TransactionStatus.InBlock:
        return "📦"
      case TransactionStatus.Finalized:
        return "🎉"
      case TransactionStatus.Failed:
        return "❌"
      case TransactionStatus.Cancelled:
        return "🚫"
      default:
        return "❓"
    }
  }

  timeline(events: TransactionEvent[]) {
    console.group(`${COLORS.bright}${COLORS.blue}Transaction Timeline${COLORS.reset}`)
    events.forEach((event, index) => {
      const time = new Date(event.timestamp).toISOString().split("T")[1].slice(0, -1)
      console.log(
        `${COLORS.dim}${index + 1}.${COLORS.reset} ${time} - ${event.type}`,
        event.blockNumber ? `(Block #${event.blockNumber})` : ""
      )
    })
    console.groupEnd()
  }
}
```

---

### 3. Transaction Store — `lib/polkadot/store/transaction-store.ts` (CREATE)

Create the `lib/polkadot/store/` directory first. No `"use client"` needed — `create()` is a store factory, not a React hook.

```typescript
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
```

---

### 4. Transaction Tracker Hook — `lib/polkadot/hooks/use-transaction-tracker.ts` (CREATE)

Needs `"use client"` because it uses `useState` and `useEffect`.

Reads the current transaction from the store via a selector. The `useEffect` fires on `transaction.status` and `transaction.confirmations` changes to log the appropriate stage. Early stages (Preparing, Signing, Broadcasting) are skipped here because they're already logged by the transfer hook directly.

```typescript
"use client"

import { useEffect, useState } from "react"
import { useTransactionStore } from "../store/transaction-store"
import { TransactionInfo, TransactionStatus } from "../types/transaction-tracker"
import { TransactionLogger } from "../utils/transaction-logger"

interface UseTransactionTrackerOptions {
  enableLogging?: boolean
  onFinalized?: (tx: TransactionInfo) => void
  onError?: (tx: TransactionInfo, error: string) => void
}

export function useTransactionTracker(
  options: UseTransactionTrackerOptions = {}
) {
  const { enableLogging = true, onFinalized, onError } = options

  const transaction = useTransactionStore((s) => s.currentTransaction)

  const [logger] = useState(() => new TransactionLogger(enableLogging))

  // Log transaction events
  useEffect(() => {
    if (!transaction || !logger) return

    switch (transaction.status) {
      case TransactionStatus.Preparing:
      case TransactionStatus.Signing:
      case TransactionStatus.Broadcasting:
        // Already logged in transfer hook
        break

      case TransactionStatus.Broadcasted:
        if (transaction.txHash) {
          logger.broadcasted(transaction.txHash)
        }
        break

      case TransactionStatus.InBlock:
        if (transaction.txHash && transaction.blockHash && transaction.blockNumber) {
          logger.inBlock(transaction.txHash, transaction.blockHash, transaction.blockNumber)
        }
        break

      case TransactionStatus.Finalized:
        if (transaction.txHash && transaction.blockHash && transaction.blockNumber) {
          logger.finalized(
            transaction.txHash,
            transaction.blockHash,
            transaction.blockNumber,
            transaction.confirmations
          )
          logger.timeline(transaction.events)
          logger.summary(transaction)
          onFinalized?.(transaction)
        }
        break

      case TransactionStatus.Failed:
        logger.error(transaction.error || "Unknown error")
        logger.summary(transaction)
        onError?.(transaction, transaction.error || "Transaction failed")
        break

      case TransactionStatus.Cancelled:
        logger.cancelled()
        break
    }
  }, [transaction?.status, transaction?.confirmations, logger, onFinalized, onError])

  return {
    transaction,
    isTracking: !!transaction &&
      transaction.status !== TransactionStatus.Finalized &&
      transaction.status !== TransactionStatus.Failed &&
      transaction.status !== TransactionStatus.Cancelled,
  }
}
```

---

### 5. Updated Transfer Hook — `lib/polkadot/hooks/use-transfer.ts` (MODIFY — replace existing)

This **replaces** the existing `use-transfer.ts` entirely. Key changes from the original:
- Uses `signSubmitAndWatch` instead of `signAndSubmit`
- Updates Zustand store at each lifecycle stage
- Uses `useTransactionStore.getState()` inside async callbacks (not the hook return value)
- Calls `subscription.unsubscribe()` on completion/error (not as a function)
- Casts `event.type as any` because PAPI's event type union doesn't perfectly match our `TransactionEvent.type` (safe — we only read the type in switch cases above)

```typescript
"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getTypedApi } from "../client"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { TransferParams, TransferResult, TransactionStatus as TransferStatus } from "../types/transfer"
import { connectInjectedExtension } from "polkadot-api/pjs-signer"
import { MultiAddress } from "@polkadot-api/descriptors"
import { useTransactionStore } from "../store/transaction-store"
import {
  TransactionInfo,
  TransactionStatus,
  TransactionEvent
} from "../types/transaction-tracker"
import { TransactionLogger } from "../utils/transaction-logger"

export function useTransfer() {
  const { account } = useAccount()
  const queryClient = useQueryClient()
  const txStore = useTransactionStore()

  return useMutation({
    mutationFn: async (params: TransferParams): Promise<TransferResult> => {
      if (!account) {
        throw new Error("No account connected")
      }

      if (account.provider === "external") {
        throw new Error("External wallets cannot sign transactions")
      }

      const logger = new TransactionLogger(true)

      // Initialize transaction info
      const txInfo: TransactionInfo = {
        status: TransactionStatus.Preparing,
        confirmations: 0,
        events: [],
        timestamp: Date.now(),
        fromAddress: account.address,
        toAddress: params.to,
        amount: params.amount,
      }

      // Set as current transaction
      txStore.setCurrentTransaction(txInfo)

      // Log preparing
      logger.preparing(
        account.address,
        params.to,
        `${params.amount.toString()} (raw)`
      )

      try {
        // Update: Signing
        txStore.updateCurrentTransaction({ status: TransactionStatus.Signing })
        logger.signing()

        const api = getTypedApi()

        // Connect to wallet
        let extension
        try {
          extension = await connectInjectedExtension(account.provider)
        } catch (e) {
          const error = "Wallet extension rejected the connection or is unavailable"
          txStore.updateCurrentTransaction({
            status: TransactionStatus.Cancelled,
            error,
          })
          throw new Error(error)
        }

        const accounts = extension.getAccounts()
        const signerAccount = accounts.find((a) => a.address === account.address)

        if (!signerAccount) {
          extension.disconnect()
          const error = "Account not found in wallet extension"
          txStore.updateCurrentTransaction({
            status: TransactionStatus.Failed,
            error,
          })
          throw new Error(error)
        }

        // Create transaction
        const tx = api.tx.Balances.transfer_keep_alive({
          dest: MultiAddress.Id(params.to),
          value: params.amount,
        })

        // Update: Broadcasting
        txStore.updateCurrentTransaction({ status: TransactionStatus.Broadcasting })
        logger.broadcasting()

        // Sign and submit with watching
        const observable = tx.signSubmitAndWatch(signerAccount.polkadotSigner)

        return new Promise((resolve, reject) => {
          const subscription = observable.subscribe({
            next: (event) => {
              const txEvent: TransactionEvent = {
                type: event.type as any,
                timestamp: Date.now(),
              }

              if (event.type === "broadcasted") {
                txStore.updateCurrentTransaction({
                  status: TransactionStatus.Broadcasted,
                  events: [...(useTransactionStore.getState().currentTransaction?.events || []), txEvent],
                })
              } else if (event.type === "txBestBlocksState") {
                if (event.found) {
                  const inBlockEvent: TransactionEvent = {
                    ...txEvent,
                    txHash: event.txHash,
                    blockHash: event.block.hash,
                    blockNumber: event.block.number,
                  }

                  txStore.updateCurrentTransaction({
                    txHash: event.txHash,
                    status: TransactionStatus.InBlock,
                    blockHash: event.block.hash,
                    blockNumber: event.block.number,
                    confirmations: 1,
                    events: [...(useTransactionStore.getState().currentTransaction?.events || []), inBlockEvent],
                  })
                }
              } else if (event.type === "finalized") {
                const finalizedEvent: TransactionEvent = {
                  ...txEvent,
                  txHash: event.txHash,
                  blockHash: event.block.hash,
                  blockNumber: event.block.number,
                }

                const currentTx = useTransactionStore.getState().currentTransaction
                const confirmations = currentTx?.blockNumber
                  ? event.block.number - currentTx.blockNumber + 1
                  : 1

                txStore.updateCurrentTransaction({
                  status: TransactionStatus.Finalized,
                  blockHash: event.block.hash,
                  blockNumber: event.block.number,
                  confirmations,
                  events: [...(currentTx?.events || []), finalizedEvent],
                })

                resolve({
                  txHash: event.txHash,
                  blockHash: event.block.hash,
                  blockNumber: event.block.number,
                  status: TransferStatus.Finalized,
                })

                subscription.unsubscribe()
                extension.disconnect()
              }
            },
            error: (error) => {
              console.error("Transaction error:", error)
              const errorMsg = error.message || "Transaction failed"

              txStore.updateCurrentTransaction({
                status: TransactionStatus.Failed,
                error: errorMsg,
              })

              reject(new Error(errorMsg))
              subscription.unsubscribe()
              extension.disconnect()
            },
          })
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        txStore.updateCurrentTransaction({
          status: TransactionStatus.Failed,
          error: errorMsg,
        })
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance"] })
    },
  })
}
```

---

### 6. Transaction Tracker Component — `lib/polkadot/components/transaction-tracker.tsx` (CREATE)

Needs `"use client"` because it uses the tracker hook (which uses React hooks internally).

Renders nothing when no transaction is in the store. Automatically shows/hides based on store state — no props needed for transaction identification.

```typescript
"use client"

import { useTransactionTracker } from "../hooks/use-transaction-tracker"
import { TransactionStatus } from "../types/transaction-tracker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, Clock, Radio, AlertCircle } from "lucide-react"
import { formatBalance } from "../utils/format-balance"
import { CHAIN_CONFIG } from "../constants"

interface TransactionTrackerProps {
  onFinalized?: () => void
  showDetails?: boolean
}

export function TransactionTracker({
  onFinalized,
  showDetails = true
}: TransactionTrackerProps) {
  const { transaction, isTracking } = useTransactionTracker({
    enableLogging: true,
    onFinalized,
  })

  if (!transaction) return null

  const getStatusIcon = () => {
    switch (transaction.status) {
      case TransactionStatus.Preparing:
      case TransactionStatus.Signing:
      case TransactionStatus.Broadcasting:
        return <Loader2 className="h-6 w-6 animate-spin text-blue-500" />

      case TransactionStatus.Broadcasted:
        return <Radio className="h-6 w-6 text-blue-500 animate-pulse" />

      case TransactionStatus.InBlock:
        return <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />

      case TransactionStatus.Finalized:
        return <CheckCircle2 className="h-6 w-6 text-green-500" />

      case TransactionStatus.Failed:
        return <XCircle className="h-6 w-6 text-red-500" />

      case TransactionStatus.Cancelled:
        return <AlertCircle className="h-6 w-6 text-orange-500" />

      default:
        return <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (transaction.status) {
      case TransactionStatus.Preparing:
        return "Preparing Transaction"
      case TransactionStatus.Signing:
        return "Awaiting Signature"
      case TransactionStatus.Broadcasting:
        return "Broadcasting Transaction"
      case TransactionStatus.Broadcasted:
        return "Transaction Broadcasted"
      case TransactionStatus.InBlock:
        return "Transaction In Block"
      case TransactionStatus.Finalized:
        return "Transaction Finalized"
      case TransactionStatus.Failed:
        return "Transaction Failed"
      case TransactionStatus.Cancelled:
        return "Transaction Cancelled"
      default:
        return "Processing Transaction"
    }
  }

  const getStatusColor = () => {
    switch (transaction.status) {
      case TransactionStatus.Finalized:
        return "text-green-500"
      case TransactionStatus.Failed:
        return "text-red-500"
      case TransactionStatus.Cancelled:
        return "text-orange-500"
      case TransactionStatus.InBlock:
        return "text-yellow-500"
      default:
        return "text-blue-500"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <CardTitle className={getStatusColor()}>{getStatusText()}</CardTitle>
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-4">
          {/* Transaction Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">From:</span>
              <span className="font-mono text-xs">
                {transaction.fromAddress.slice(0, 8)}...{transaction.fromAddress.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To:</span>
              <span className="font-mono text-xs">
                {transaction.toAddress.slice(0, 8)}...{transaction.toAddress.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">
                {formatBalance(transaction.amount, CHAIN_CONFIG.decimals, CHAIN_CONFIG.symbol)}
              </span>
            </div>
          </div>

          {/* Transaction Hash */}
          {transaction.txHash && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Transaction Hash:</span>
              <div className="bg-secondary/50 rounded p-2 font-mono text-xs break-all">
                {transaction.txHash}
              </div>
            </div>
          )}

          {/* Block Info */}
          {transaction.blockNumber && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/50 rounded">
              <div>
                <div className="text-xs text-muted-foreground">Block Number</div>
                <div className="font-semibold">#{transaction.blockNumber}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Confirmations</div>
                <div className="font-semibold">{transaction.confirmations}</div>
              </div>
            </div>
          )}

          {/* Block Hash */}
          {transaction.blockHash && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Block Hash:</span>
              <div className="bg-secondary/50 rounded p-2 font-mono text-xs break-all">
                {transaction.blockHash}
              </div>
            </div>
          )}

          {/* Error Message */}
          {transaction.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
              <div className="text-sm font-medium text-red-500">Error</div>
              <div className="text-xs text-red-500/80 mt-1">{transaction.error}</div>
            </div>
          )}

          {/* Progress Indicator */}
          {isTracking && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{transaction.confirmations} confirmations</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: `${Math.min((transaction.confirmations / 3) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Timeline */}
          {transaction.events.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm font-medium">Event Timeline</div>
              <div className="space-y-1">
                {transaction.events.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>
                      {new Date(event.timestamp).toLocaleTimeString()} - {event.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
```

---

## Integration

### Transfer Page — `app/transfer/page.tsx` (MODIFY)

Add the `TransactionTracker` component below the `TransferForm`. No state management needed in the page — both components communicate through the Zustand store.

```typescript
"use client"

import { TransferForm } from "@/lib/polkadot/components/transfer-form"
import { TransactionTracker } from "@/lib/polkadot/components/transaction-tracker"
import { Web3ConnectButton } from "@/lib/web3"

export default function TransferPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Send Funds</h1>
          <Web3ConnectButton />
        </div>

        <TransferForm />

        <TransactionTracker />
      </div>
    </div>
  )
}
```

---

## Console Output Example

```
⚙️ Preparing Transaction
23:45:12.456
  From: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
  To: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty
  Amount: 1000000000000 (raw)

✍️ Awaiting Signature
23:45:12.789
  Status: Wallet popup opened
  Action: Please approve in your wallet

📡 Broadcasting Transaction
23:45:15.234
  Status: Submitting to network

✅ Transaction Broadcasted
23:45:15.567
  Transaction Hash: 0x1234567890abcdef...
  Status: Waiting for block inclusion

📦 Transaction In Block
23:45:21.123
  Transaction Hash: 0x1234567890abcdef...
  Block Hash: 0xabcdef1234567890...
  Block Number: #1234567
  Confirmations: 1
  Status: Waiting for finalization

🎉 Transaction Finalized
23:45:27.456
  Transaction Hash: 0x1234567890abcdef...
  Block Hash: 0xabcdef1234567890...
  Block Number: #1234567
  Confirmations: 3
  Status: ✓ Complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Transaction Summary

Status: 🎉 finalized
Hash: 0x1234567890abcdef...
Block Hash: 0xabcdef1234567890...
Block Number: #1234567
Confirmations: 3
Events: 4
Duration: 15234ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Testing Checklist

- [ ] Transaction preparation logs appear in console
- [ ] Wallet signature request logged
- [ ] Broadcast confirmation logged with hash
- [ ] Block inclusion logged with block hash and number
- [ ] Finalization logged with summary and timeline
- [ ] Error states logged when transaction fails
- [ ] Cancelled state logged when user rejects in wallet
- [ ] Tracker component shows/hides based on store state
- [ ] Progress bar fills as confirmations increase
- [ ] New transfer replaces previous tracker display
