# Polkadot Asset Transfer System

Native asset transfer for Polkadot/Substrate using **Polkadot API (PAPI)**, React Query, and wallet integration with full TypeScript support.

**Prerequisites:** Next.js 16+, TypeScript, Tailwind CSS, Wallet Connection System (see `wallet-polkadot-wallet-connection.md`)

---

## Dependencies

```json
{
  "dependencies": {
    "polkadot-api": "^1.20.1",
    "@polkadot-api/descriptors": "file:.papi/descriptors",
    "@polkadot/util-crypto": "^13.5.6",
    "@tanstack/react-query": "^5.90.2",
    "zustand": "^5.0.8",
    "next": "^16.0.10",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "lucide-react": "^0.552.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1",
    "class-variance-authority": "^0.7.1"
  },
  "devDependencies": {
    "@polkadot-api/cli": "^0.18.1"
  }
}
```

The `@polkadot-api/cli` version must match the `polkadot-api` runtime version. Verify by checking `node_modules/polkadot-api/node_modules/@polkadot-api/cli/package.json` after install.

---

## PAPI Setup

Generate chain descriptors before writing any code. PAPI requires generated type descriptors to interact with the chain.

```bash
npm install

# Add chain descriptor using well-known chain name
npx papi add paseo --name "paseo_asset_hub"
```

This creates:

- `.papi/polkadot-api.json` — config with chain entry named `paseo`
- `.papi/descriptors/` — generated TypeScript types for the chain

Do NOT manually create `.papi/polkadot-api.json` — always use `npx papi add` to generate it.

After generation, verify the descriptor exports in `.papi/descriptors/dist/index.d.ts`. The exported name (`paseo`) is what you import in client code.

---

## TypeScript Configuration

`tsconfig.json` must target **ES2022 or higher** for BigInt literal support (`0n`):

```json
{
  "compilerOptions": {
    "target": "ES2022"
  }
}
```

---

## File Structure

```
lib/
├── utils.ts                             # cn() helper for Tailwind class merging
├── polkadot/
│   ├── client.ts                        # PAPI client singleton
│   ├── constants.ts                     # Chain config (decimals, symbol, RPC)
│   ├── types/
│   │   └── transfer.ts                  # Transfer types
│   ├── hooks/
│   │   ├── use-balance.ts               # Balance query
│   │   ├── use-transfer.ts              # Transfer mutation (signing)
│   │   └── use-transfer-fee.ts          # Fee estimation
│   ├── utils/
│   │   ├── format-balance.ts            # Balance formatting
│   │   └── parse-amount.ts              # Amount parsing
│   └── components/
│       ├── transfer-form.tsx            # Main transfer UI
│       ├── balance-display.tsx          # Balance component
│       ├── amount-input.tsx             # Amount input with validation
│       └── address-input.tsx            # Address input with validation
│
├── web3/                                # From wallet connection system
│   ├── hooks/use-account.ts
│   └── utils/address.ts
│
components/ui/
├── input.tsx                            # Shadcn Input
├── label.tsx                            # Shadcn Label
└── card.tsx                             # Shadcn Card

app/
└── transfer/
    └── page.tsx                         # Transfer page
```

---

## Implementation

### 1. Shared Utility

<details>
<summary><code>lib/utils.ts</code></summary>

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

</details>

---

### 2. Chain Constants

<details>
<summary><code>lib/polkadot/constants.ts</code></summary>

```typescript
export const CHAIN_CONFIG = {
  rpcEndpoint: "wss://asset-hub-paseo.dotters.network",
  decimals: 10,
  symbol: "PAS",
} as const
```

</details>

---

### 3. PAPI Client

<details>
<summary><code>lib/polkadot/client.ts</code></summary>

```typescript
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { paseo } from "@polkadot-api/descriptors"
import { CHAIN_CONFIG } from "./constants"

let clientInstance: ReturnType<typeof createClient> | null = null

export function getPolkadotClient() {
  if (clientInstance) return clientInstance

  const wsProvider = getWsProvider(CHAIN_CONFIG.rpcEndpoint)
  clientInstance = createClient(wsProvider)

  return clientInstance
}

export function getTypedApi() {
  const client = getPolkadotClient()
  return client.getTypedApi(paseo)
}

export function disconnect() {
  if (clientInstance) {
    clientInstance.destroy()
    clientInstance = null
  }
}
```

</details>

Key details:
- Import `getWsProvider` from `polkadot-api/ws-provider` (the `/web` sub-path is deprecated)
- Import the descriptor by the **exact name** from `@polkadot-api/descriptors` (matches what `npx papi add` generated)

---

### 4. Types

<details>
<summary><code>lib/polkadot/types/transfer.ts</code></summary>

```typescript
export interface TransferParams {
  to: string
  amount: bigint
}

export interface TransferResult {
  txHash: string
  blockHash?: string
  blockNumber?: number
  status: TransactionStatus
}

export enum TransactionStatus {
  Pending = "pending",
  InBlock = "in-block",
  Finalized = "finalized",
  Failed = "failed",
}

export interface Balance {
  free: bigint
  reserved: bigint
  frozen: bigint
  transferable: bigint
  decimals: number
  symbol: string
}

export interface FeeEstimate {
  estimatedFee: bigint
  formattedFee: string
  canAfford: boolean
}
```

</details>

---

### 5. Hooks

#### Transfer Hook

<details>
<summary><code>lib/polkadot/hooks/use-transfer.ts</code></summary>

```typescript
"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getTypedApi } from "../client"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { TransferParams, TransferResult, TransactionStatus } from "../types/transfer"
import { connectInjectedExtension } from "polkadot-api/pjs-signer"
import { MultiAddress } from "@polkadot-api/descriptors"

export function useTransfer() {
  const { account } = useAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: TransferParams): Promise<TransferResult> => {
      if (!account) {
        throw new Error("No account connected")
      }

      if (account.provider === "external") {
        throw new Error("External wallets cannot sign transactions")
      }

      const api = getTypedApi()

      // Get PAPI-compatible signer via connectInjectedExtension.
      // The account.provider value (e.g. "talisman", "polkadot-js")
      // maps to the key in window.injectedWeb3.
      let extension
      try {
        extension = await connectInjectedExtension(account.provider)
      } catch (e) {
        throw new Error("Wallet extension rejected the connection or is unavailable")
      }

      const accounts = extension.getAccounts()
      const signerAccount = accounts.find(
        (a) => a.address === account.address
      )

      if (!signerAccount) {
        extension.disconnect()
        throw new Error("Account not found in wallet extension")
      }

      // dest MUST be MultiAddress.Id(address) — PAPI uses typed enums,
      // passing a raw string will not work.
      const tx = api.tx.Balances.transfer_keep_alive({
        dest: MultiAddress.Id(params.to),
        value: params.amount,
      })

      // signAndSubmit takes a PolkadotSigner as the first argument.
      // This signer comes from connectInjectedExtension which bridges
      // PJS wallet signers to PAPI's PolkadotSigner interface.
      const result = await tx.signAndSubmit(signerAccount.polkadotSigner)

      extension.disconnect()

      if (!result.ok) {
        throw new Error("Transaction failed on-chain")
      }

      return {
        txHash: result.txHash,
        blockHash: result.block.hash,
        blockNumber: result.block.number,
        status: TransactionStatus.Finalized,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance"] })
    },
  })
}
```

</details>

**PAPI transaction patterns:**

| Pattern | Usage |
|---------|-------|
| **dest parameter** | Always `MultiAddress.Id(address)` — never a plain string |
| **Signer** | `connectInjectedExtension(providerName)` from `polkadot-api/pjs-signer`, then `account.polkadotSigner` |
| **signAndSubmit** | `tx.signAndSubmit(polkadotSigner)` — first arg is the signer object, not an address |

Do NOT use `wallet.signer` from `@talismn/connect-wallets` — that is a PJS-format signer incompatible with PAPI. The `connectInjectedExtension` function bridges the same browser wallet extension to PAPI's `PolkadotSigner` interface.

---

#### Fee Estimation Hook

<details>
<summary><code>lib/polkadot/hooks/use-transfer-fee.ts</code></summary>

```typescript
"use client"

import { useQuery } from "@tanstack/react-query"
import { getTypedApi } from "../client"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { FeeEstimate } from "../types/transfer"
import { formatBalance } from "../utils/format-balance"
import { MultiAddress } from "@polkadot-api/descriptors"
import { CHAIN_CONFIG } from "../constants"

export function useTransferFee(to: string | null, amount: bigint | null) {
  const { account } = useAccount()

  return useQuery({
    queryKey: ["transfer-fee", account?.address, to, amount?.toString()],
    queryFn: async (): Promise<FeeEstimate> => {
      if (!account?.address || !to || !amount) {
        return { estimatedFee: 0n, formattedFee: "0", canAfford: false }
      }

      const api = getTypedApi()

      const tx = api.tx.Balances.transfer_keep_alive({
        dest: MultiAddress.Id(to),
        value: amount,
      })

      const paymentInfo = await tx.getEstimatedFees(account.address)

      return {
        estimatedFee: paymentInfo,
        formattedFee: formatBalance(paymentInfo, CHAIN_CONFIG.decimals, CHAIN_CONFIG.symbol),
        canAfford: true,
      }
    },
    enabled: !!account?.address && !!to && !!amount,
    staleTime: 5000,
  })
}
```

</details>

---

#### Balance Hook

<details>
<summary><code>lib/polkadot/hooks/use-balance.ts</code></summary>

```typescript
"use client"

import { useQuery } from "@tanstack/react-query"
import { getTypedApi } from "../client"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { Balance } from "../types/transfer"
import { CHAIN_CONFIG } from "../constants"

export function useBalance() {
  const { account } = useAccount()

  return useQuery({
    queryKey: ["balance", account?.address],
    queryFn: async (): Promise<Balance | null> => {
      if (!account?.address) return null

      const api = getTypedApi()
      const accountInfo = await api.query.System.Account.getValue(account.address)

      if (!accountInfo) return null

      const { free, reserved, frozen } = accountInfo.data
      const transferable = free - frozen

      return {
        free,
        reserved,
        frozen,
        transferable,
        decimals: CHAIN_CONFIG.decimals,
        symbol: CHAIN_CONFIG.symbol,
      }
    },
    enabled: !!account?.address,
    refetchInterval: 10000,
    staleTime: 5000,
  })
}
```

</details>

---

### 6. Utilities

<details>
<summary><code>lib/polkadot/utils/format-balance.ts</code></summary>

```typescript
export function formatBalance(
  amount: bigint,
  decimals: number,
  symbol?: string
): string {
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const remainder = amount % divisor

  const wholeStr = whole.toString()
  const remainderStr = remainder.toString().padStart(decimals, "0")

  const trimmed = remainderStr.replace(/0+$/, "")
  const formatted = trimmed ? `${wholeStr}.${trimmed}` : wholeStr

  return symbol ? `${formatted} ${symbol}` : formatted
}

export function formatBalanceShort(
  amount: bigint,
  decimals: number,
  symbol?: string
): string {
  const formatted = formatBalance(amount, decimals)
  const [whole, fraction] = formatted.split(".")

  const shortFraction = fraction ? fraction.slice(0, 4) : ""
  const short = shortFraction ? `${whole}.${shortFraction}` : whole

  return symbol ? `${short} ${symbol}` : short
}
```

</details>

<details>
<summary><code>lib/polkadot/utils/parse-amount.ts</code></summary>

```typescript
export function parseAmount(input: string, decimals: number): bigint | null {
  if (!input || input === "") return null

  try {
    const cleaned = input.replace(/[^\d.]/g, "")
    const [whole, fraction = ""] = cleaned.split(".")

    if (whole === "" && fraction === "") return null

    const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals)
    const combined = (whole || "0") + paddedFraction
    return BigInt(combined)
  } catch {
    return null
  }
}

export function validateAmount(input: string): boolean {
  return /^\d*\.?\d*$/.test(input)
}
```

</details>

---

### 7. Components

<details>
<summary><code>lib/polkadot/components/balance-display.tsx</code></summary>

```typescript
"use client"

import { useBalance } from "../hooks/use-balance"
import { formatBalanceShort } from "../utils/format-balance"
import { Loader2 } from "lucide-react"

export function BalanceDisplay({ showTransferable = true }: { showTransferable?: boolean }) {
  const { data: balance, isLoading, error } = useBalance()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading balance...</span>
      </div>
    )
  }

  if (error || !balance) {
    return (
      <div className="text-sm text-muted-foreground">
        {error ? "Failed to load balance" : "No balance available"}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-muted-foreground">Balance:</span>
        <span className="text-lg font-semibold">
          {formatBalanceShort(balance.free, balance.decimals, balance.symbol)}
        </span>
      </div>
      {showTransferable && (
        <div className="text-xs text-muted-foreground">
          Transferable: {formatBalanceShort(balance.transferable, balance.decimals, balance.symbol)}
        </div>
      )}
    </div>
  )
}
```

</details>

<details>
<summary><code>lib/polkadot/components/address-input.tsx</code></summary>

```typescript
"use client"

import { useState, useEffect } from "react"
import { isValidSubstrateAddress, toGenericSubstrateAddress } from "@/lib/web3/utils/address"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, X } from "lucide-react"

interface AddressInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
}

export function AddressInput({
  value,
  onChange,
  label = "Recipient Address",
  placeholder = "Enter Substrate address...",
}: AddressInputProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [formatted, setFormatted] = useState<string>("")

  useEffect(() => {
    if (!value) {
      setIsValid(null)
      setFormatted("")
      return
    }

    const valid = isValidSubstrateAddress(value)
    setIsValid(valid)

    if (valid) {
      const generic = toGenericSubstrateAddress(value)
      setFormatted(generic || value)
    } else {
      setFormatted("")
    }
  }, [value])

  return (
    <div className="space-y-2">
      <Label htmlFor="address">{label}</Label>
      <div className="relative">
        <Input
          id="address"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`font-mono text-sm pr-10 ${
            isValid === false ? "border-red-500" : ""
          } ${isValid === true ? "border-green-500" : ""}`}
        />
        {isValid !== null && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
          </div>
        )}
      </div>
      {isValid === false && (
        <p className="text-sm text-red-500">Invalid Substrate address</p>
      )}
      {formatted && formatted !== value && (
        <p className="text-xs text-muted-foreground font-mono break-all">
          Generic format: {formatted}
        </p>
      )}
    </div>
  )
}
```

</details>

<details>
<summary><code>lib/polkadot/components/amount-input.tsx</code></summary>

```typescript
"use client"

import { useState, useEffect } from "react"
import { parseAmount, validateAmount } from "../utils/parse-amount"
import { formatBalanceShort } from "../utils/format-balance"
import { useBalance } from "../hooks/use-balance"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  onAmountChange: (amount: bigint | null) => void
  label?: string
}

export function AmountInput({
  value,
  onChange,
  onAmountChange,
  label = "Amount",
}: AmountInputProps) {
  const { data: balance } = useBalance()
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (!value) {
      setError("")
      onAmountChange(null)
      return
    }

    if (!validateAmount(value)) {
      setError("Invalid amount format")
      onAmountChange(null)
      return
    }

    if (balance) {
      const amount = parseAmount(value, balance.decimals)
      if (amount && amount > balance.transferable) {
        setError("Insufficient balance")
      } else {
        setError("")
      }
      onAmountChange(amount)
    }
  }, [value, balance, onAmountChange])

  const handleMax = () => {
    if (balance) {
      const maxAmount = formatBalanceShort(balance.transferable, balance.decimals)
      onChange(maxAmount)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="amount">{label}</Label>
        {balance && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMax}
            className="h-auto p-0 text-xs text-blue-500 hover:text-blue-600"
          >
            Max: {formatBalanceShort(balance.transferable, balance.decimals, balance.symbol)}
          </Button>
        )}
      </div>
      <Input
        id="amount"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className={`text-lg font-semibold ${error ? "border-red-500" : ""}`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
```

</details>

<details>
<summary><code>lib/polkadot/components/transfer-form.tsx</code></summary>

```typescript
"use client"

import { useState } from "react"
import { useTransfer } from "../hooks/use-transfer"
import { useTransferFee } from "../hooks/use-transfer-fee"
import { useBalance } from "../hooks/use-balance"
import { useAccount } from "@/lib/web3/hooks/use-account"
import { AddressInput } from "./address-input"
import { AmountInput } from "./amount-input"
import { BalanceDisplay } from "./balance-display"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowRight, CheckCircle2, XCircle } from "lucide-react"
import { formatBalanceShort } from "../utils/format-balance"

export function TransferForm() {
  const { account } = useAccount()
  const { data: balance } = useBalance()
  const { mutate: transfer, isPending, isSuccess, isError, error } = useTransfer()

  const [recipientAddress, setRecipientAddress] = useState("")
  const [amountInput, setAmountInput] = useState("")
  const [amount, setAmount] = useState<bigint | null>(null)

  const { data: feeEstimate } = useTransferFee(recipientAddress, amount)

  // Fee estimate is informational only — do not gate submit on it,
  // as it may fail silently on slow RPC connections
  const canSubmit =
    account &&
    recipientAddress &&
    amount &&
    amount > 0n &&
    balance &&
    amount <= balance.transferable

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    transfer({
      to: recipientAddress,
      amount: amount!,
    })
  }

  const handleReset = () => {
    setRecipientAddress("")
    setAmountInput("")
    setAmount(null)
  }

  if (!account) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>Please connect your wallet to send funds</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="h-6 w-6" />
            <CardTitle>Transfer Successful!</CardTitle>
          </div>
          <CardDescription>
            Your transaction has been submitted and is being processed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleReset} className="w-full">
            Send Another Transfer
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Funds</CardTitle>
        <CardDescription>
          Transfer assets to another account on the network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <BalanceDisplay />

          <AddressInput
            value={recipientAddress}
            onChange={setRecipientAddress}
          />

          <AmountInput
            value={amountInput}
            onChange={setAmountInput}
            onAmountChange={setAmount}
          />

          {feeEstimate && amount && (
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Fee:</span>
                <span className="font-medium">{feeEstimate.formattedFee}</span>
              </div>
              {balance && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold">
                    {formatBalanceShort(
                      amount + feeEstimate.estimatedFee,
                      balance.decimals,
                      balance.symbol
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {isError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-500">Transaction Failed</p>
                  <p className="text-sm text-red-500/80 mt-1">
                    {error instanceof Error ? error.message : "Unknown error occurred"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={!canSubmit || isPending}
            className="w-full"
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Send Transfer
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

</details>

---

### 8. Shadcn UI Components

Install via CLI or create manually. These must exist before implementing the transfer components.

```bash
npx shadcn@latest add input label card
```

<details>
<summary><code>components/ui/input.tsx</code></summary>

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

</details>

<details>
<summary><code>components/ui/label.tsx</code></summary>

```typescript
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

</details>

<details>
<summary><code>components/ui/card.tsx</code></summary>

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

</details>

---

## Usage

### Transfer Page

```typescript
// app/transfer/page.tsx
"use client"

import { TransferForm } from "@/lib/polkadot/components/transfer-form"
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
      </div>
    </div>
  )
}
```

### Programmatic Transfer

```typescript
import { useTransfer } from "@/lib/polkadot/hooks/use-transfer"
import { parseAmount } from "@/lib/polkadot/utils/parse-amount"

function MyComponent() {
  const { mutate: transfer } = useTransfer()

  const handleTransfer = () => {
    transfer({
      to: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      amount: parseAmount("1.5", 10)!,
    })
  }

  return <button onClick={handleTransfer}>Send</button>
}
```

---

## Testing Checklist

- [ ] Connect wallet
- [ ] Balance displays correctly
- [ ] Enter valid recipient address (green checkmark)
- [ ] Enter invalid address (red X)
- [ ] Enter amount less than balance (no error)
- [ ] Enter amount greater than balance ("Insufficient balance")
- [ ] Click "Max" button (fills maximum transferable)
- [ ] Fee estimate appears
- [ ] Submit transfer (wallet popup appears)
- [ ] Approve in wallet
- [ ] See success message
- [ ] Balance updates after transfer

---

## Resources

- [Polkadot API (PAPI) Docs](https://papi.how/)
- [PAPI Signers](https://papi.how/signers)
- [Substrate Addresses](https://wiki.polkadot.network/docs/learn-accounts)
