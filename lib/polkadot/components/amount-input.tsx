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
