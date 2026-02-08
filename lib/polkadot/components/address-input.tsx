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
