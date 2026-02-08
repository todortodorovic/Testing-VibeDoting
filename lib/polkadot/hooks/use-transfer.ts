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
