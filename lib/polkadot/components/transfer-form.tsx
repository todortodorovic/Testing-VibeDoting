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
