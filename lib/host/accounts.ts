"use client"

import {
  connectInjectedExtension,
  type InjectedExtension,
  type InjectedPolkadotAccount,
} from "polkadot-api/pjs-signer"
import { SpektrExtensionName } from "@novasamatech/product-sdk"

let cachedExtension: InjectedExtension | null = null

async function getSpektrExtension(): Promise<InjectedExtension | null> {
  if (cachedExtension) return cachedExtension

  const injected = (window as any).injectedWeb3
  if (!injected?.[SpektrExtensionName]) return null

  try {
    // Timeout wrapper — connectInjectedExtension awaits accounts.get() internally
    const extension = await Promise.race([
      connectInjectedExtension(SpektrExtensionName),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timed out after 15s")), 15000)
      ),
    ])

    cachedExtension = extension
    return extension
  } catch (e: any) {
    console.log("[Host Accounts] Connection failed:", e?.message || e)
    return null
  }
}

export async function getHostAccounts() {
  const extension = await getSpektrExtension()
  if (!extension) return []

  // getAccounts() is SYNCHRONOUS — accounts were fetched during connectInjectedExtension
  const accounts = extension.getAccounts()

  return accounts.map((acc: InjectedPolkadotAccount) => ({
    name: acc.name || "Host Account",
    address: acc.address,
    polkadotSigner: acc.polkadotSigner, // PAPI signer, automatically attached
  }))
}

export function subscribeHostAccounts(
  onAccountsChanged: (accounts: any[]) => void
): () => void {
  let unsubscribe = () => {}

  getSpektrExtension().then((extension) => {
    if (!extension) return
    unsubscribe = extension.subscribe((accounts: InjectedPolkadotAccount[]) => {
      onAccountsChanged(accounts.map((acc) => ({
        name: acc.name || "Host Account",
        address: acc.address,
        polkadotSigner: acc.polkadotSigner,
      })))
    })
  })

  return () => unsubscribe()
}
