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
