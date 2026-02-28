# Polkadot Triangle Host API Integration Guide

## Overview

This guide explains how to integrate `@novasamatech/product-sdk` into a Next.js application so that when the app runs inside a Polkadot Triangle host (desktop webview or web iframe), it automatically picks up the account from the host application (Polkadot app) instead of requiring browser wallet extensions (Talisman, Nova Wallet, SubWallet, etc.).

Standalone mode (app running in a regular browser outside the host) continues to work with browser wallets as before.

## Installation

```bash
npm install @novasamatech/product-sdk --save -E
```

The SDK also requires these peer dependencies (likely already installed in a Polkadot project):

```bash
npm install polkadot-api @polkadot-api/polkadot-signer
```

Documentation: https://www.npmjs.com/package/@novasamatech/product-sdk?activeTab=readme

## Architecture

The integration consists of 4 modules, all placed in `lib/host/`:

```
lib/host/
├── detect.ts      — Host environment detection
├── connection.ts   — Spektr extension injection
├── accounts.ts     — Account retrieval via official SDK pattern
├── provider.ts     — Host-aware PAPI provider (chain RPC routing)
└── index.ts        — Barrel export
```

## Module 1: Host Detection (`detect.ts`)

Detects whether the app is running inside a Triangle host or standalone.

```typescript
export type HostEnvironment = "desktop-webview" | "web-iframe" | "standalone"

export function detectHostEnvironment(): HostEnvironment {
  if (typeof window === "undefined") return "standalone"

  // Desktop host injects this mark into the webview
  if ((window as any).__HOST_WEBVIEW_MARK__ === true) {
    return "desktop-webview"
  }

  // Web iframe host
  try {
    if (window !== window.top) {
      return "web-iframe"
    }
  } catch {
    return "web-iframe"
  }

  return "standalone"
}

export function isInHost(): boolean {
  return detectHostEnvironment() !== "standalone"
}
```

**Key points:**
- SSR safe — always returns `"standalone"` when `typeof window === "undefined"`
- Desktop host sets `window.__HOST_WEBVIEW_MARK__ = true` before loading the app
- Web iframe is detected via `window !== window.top`

## Module 2: Connection (`connection.ts`)

Injects the Spektr wallet extension into `window.injectedWeb3` using the SDK.

```typescript
import {
  injectSpektrExtension,
  SpektrExtensionName,
} from "@novasamatech/product-sdk"
import { isInHost } from "./detect"

let spektrReady = false

export async function connectToHost(
  maxRetries = 10,
  delayMs = 500
): Promise<boolean> {
  if (!isInHost()) return false
  if (spektrReady) return true

  for (let i = 0; i < maxRetries; i++) {
    try {
      const ready = await injectSpektrExtension()
      if (ready) {
        spektrReady = true
        return true
      }
    } catch (e: any) {
      console.log(`[Host] Attempt ${i + 1} error: ${e?.message || e}`)
    }
    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  return false
}
```

**Key points:**
- Call `injectSpektrExtension()` **without arguments** — the SDK defaults to `sandboxTransport` internally. Do NOT pass `sandboxTransport` explicitly.
- Retry loop is necessary because the host may not have initialized the `MessagePort` yet when the app loads.
- After success, `window.injectedWeb3["spektr"]` is available with `.enable()`, `.accounts`, and `.signer`.

## Module 3: Accounts (`accounts.ts`)

Retrieves accounts from the host using the **official SDK README pattern**.

```typescript
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
```

**Key points:**
- Use `connectInjectedExtension(SpektrExtensionName)` from `"polkadot-api/pjs-signer"` — this is the **official pattern** from the SDK README. Do NOT manually access `window.injectedWeb3`.
- `connectInjectedExtension` internally calls `enable()` + `await accounts.get()` + `accounts.subscribe()`.
- `extension.getAccounts()` is **synchronous** after `connectInjectedExtension` resolves — accounts are cached.
- Each account has `polkadotSigner` automatically attached (no need for manual `getPolkadotSignerFromPjs`).
- **Always wrap with a timeout** (15s recommended) because `accounts.get()` calls `hostApi.getNonProductAccounts()` which can hang if the host is unresponsive.
- **Cache the extension** — call `connectInjectedExtension` only once, then reuse the cached instance.

## Module 4: Host-Aware Provider (`provider.ts`)

Routes chain RPC through the host when available, falls back to direct WebSocket.

```typescript
import { createPapiProvider } from "@novasamatech/product-sdk"
import { createClient, PolkadotClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/web"
import { isInHost } from "./detect"

const CHAIN_GENESIS = "0x..." // genesis hash of target chain
const CHAIN_WS = "wss://..."  // WebSocket endpoint for fallback

let client: PolkadotClient | null = null

export function getClient(): PolkadotClient {
  if (client) return client

  if (isInHost()) {
    // Host mode — route RPC through host, fallback to WS
    const provider = createPapiProvider(CHAIN_GENESIS, getWsProvider(CHAIN_WS))
    client = createClient(provider)
  } else {
    // Standalone mode — direct WebSocket
    const provider = getWsProvider(CHAIN_WS)
    client = createClient(provider)
  }

  return client
}
```

**Key points:**
- `createPapiProvider(genesisHash, fallbackProvider)` takes the chain genesis hash (hex string) and an optional fallback WebSocket provider.
- In host mode, all chain RPC calls are routed through the host application.
- In standalone mode, it connects directly via WebSocket.

## React Integration

Add a `HostAutoConnect` component to your main provider:

```tsx
"use client"

import { useEffect, useRef } from "react"
import { isInHost } from "@/lib/host/detect"
import { connectToHost } from "@/lib/host/connection"
import { getHostAccounts, subscribeHostAccounts } from "@/lib/host/accounts"

function HostAutoConnect() {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    if (!isInHost()) return
    initializedRef.current = true

    async function init() {
      // Step 1: Inject Spektr extension
      const ready = await connectToHost()
      if (!ready) return

      // Step 2: Get accounts from host
      const accounts = await getHostAccounts()
      if (accounts.length > 0) {
        // Step 3: Set first account in your app's store
        setAccount(accounts[0])
        setStatus("host-api", "connected")
      }

      // Step 4: Subscribe to account changes (login/logout in host)
      subscribeHostAccounts((newAccounts) => {
        if (newAccounts.length > 0) {
          setAccount(newAccounts[0])
        } else {
          setAccount(null)
        }
      })
    }

    init().catch(console.error)
  }, [])

  return null
}

// Add <HostAutoConnect /> to your provider tree
export function AppProvider({ children }) {
  return (
    <>
      <HostAutoConnect />
      {children}
    </>
  )
}
```

## Transaction Signing

The host extension provides a PJS-compatible signer (`signPayload`, `signRaw`). Use it exactly like any browser wallet signer:

```typescript
import { SpektrExtensionName } from "@novasamatech/product-sdk"

// Get signer from Spektr extension (already injected by connectToHost)
const injected = (window as any).injectedWeb3
const ext = await injected[SpektrExtensionName].enable("MyApp")
const signer = ext.signer // { signPayload, signRaw }

// Use with @polkadot/api — same as any wallet signer
const result = await tx.signAndSend(address, { signer }, (status) => {
  // handle status updates
})
```

For the PAPI signer (used with `polkadot-api`), use the `polkadotSigner` from the account object returned by `getHostAccounts()`:

```typescript
const accounts = await getHostAccounts()
const signer = accounts[0].polkadotSigner

// Use with PAPI
const result = await typedApi.tx.Balances.transfer_keep_alive({
  dest: MultiAddress.Id(recipient),
  value: amount,
}).signSubmitAndWatch(signer)
```

## Type System Changes

Add `HostAPI` to your wallet provider enum:

```typescript
export enum WalletProviderType {
  PolkadotJS = "polkadot-js",
  Talisman = "talisman",
  // ... other wallets
  HostAPI = "host-api",  // <-- add this
}
```

Update any `Record<WalletProviderType, ...>` types to include the new entry:

```typescript
export const WALLET_INFO = {
  // ... existing wallets
  [WalletProviderType.HostAPI]: {
    name: "Polkadot App",
    description: "Account from Polkadot Triangle host",
  },
}
```

## Critical Rules

1. **`injectSpektrExtension()`** — call WITHOUT arguments. The SDK defaults to `sandboxTransport` internally. Passing it explicitly is unnecessary and was the old pattern.

2. **`connectInjectedExtension(SpektrExtensionName)`** — import from `"polkadot-api/pjs-signer"`. This is the official pattern. Do NOT manually access `window.injectedWeb3["spektr"].enable()` for account retrieval.

3. **`extension.getAccounts()`** is SYNCHRONOUS after `connectInjectedExtension` resolves.

4. **Always timeout `connectInjectedExtension`** — wrap with `Promise.race` and a 15-second timeout. The internal `accounts.get()` calls `hostApi.getNonProductAccounts()` which can hang.

5. **Cache the extension** — call `connectInjectedExtension` only once, store in a module-level variable, and reuse.

6. **SSR safe** — all host functions must check `typeof window !== "undefined"` before accessing browser APIs.

7. **Do NOT remove browser wallet dependencies** — they are needed for standalone fallback mode.

8. **Barrel import side effects** — importing from `"@novasamatech/product-sdk"` loads the entire barrel which creates module-level singletons (`hostApi`, `metaProvider`, `hostLocalStorage`, `preimageManager`) on `sandboxTransport`. This is expected and should not cause issues, but be aware that subpath imports (e.g., `@novasamatech/product-sdk/dist/injectWeb3.js`) are NOT supported due to the SDK's `exports` field.

## SDK Internals (for debugging)

Understanding what happens under the hood:

### `injectSpektrExtension()` (in `injectWeb3.js`):
1. Checks `sandboxTransport.isReady()` — waits for host communication channel
2. Creates a `hostApi` instance via `createHostApi(sandboxTransport)`
3. Builds an extension object with `accounts.get()`, `accounts.subscribe()`, `signer.signPayload()`, `signer.signRaw()`
4. Calls `injectExtension(enable, { name: "spektr" })` to register in `window.injectedWeb3`

### `connectInjectedExtension(name)` (in `polkadot-api/pjs-signer`):
1. Accesses `window.injectedWeb3[name]`
2. Calls `entry.enable(dappName)` — triggers the extension's enable function
3. Awaits `enabledExtension.accounts.get()` — **this is where hangs can occur**
4. Subscribes to `enabledExtension.accounts.subscribe()` for future changes
5. Returns `{ name, getAccounts(), subscribe(), disconnect() }` with `polkadotSigner` attached to each account

### `sandboxTransport` (in `sandboxTransport.js`):
- Handles both **iframe** (`window.top.postMessage`) and **webview** (`window.__HOST_API_PORT__`) communication
- `isCorrectEnvironment()` returns true if either `window !== window.top` or `window.__HOST_WEBVIEW_MARK__ === true`
- `isReady()` resolves when the host communication channel is established

### `accounts.get()` internally calls:
```
hostApi.getNonProductAccounts(enumValue('v1', undefined))
```
Which sends a message through `sandboxTransport` to the host and awaits a response with account data (name, publicKey). The publicKey is then decoded to an SS58 address via `AccountId().dec(publicKey)`.
