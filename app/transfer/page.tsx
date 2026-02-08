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
