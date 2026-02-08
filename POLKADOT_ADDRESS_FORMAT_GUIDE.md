# Polkadot/Substrate Address Format - Complete Guide

Comprehensive guide to understanding, recognizing, converting, and displaying Polkadot/Substrate addresses across different networks, including SS58 format, network prefixes, and EVM/H160 address mapping.

---

## Address Format Overview

Polkadot and all Substrate-based chains use the **SS58 address format** - a Base58-encoded representation of a public key with a network-specific prefix.

### Core Concepts

1. **Same Public Key, Different Addresses** - One account can have multiple address representations
2. **Network Prefix** - Determines which network the address is formatted for
3. **Base58 Encoding** - Uses Bitcoin's Base58 alphabet (no 0, O, I, l)
4. **Checksum** - Last 2 bytes prevent typos
5. **EVM Compatibility** - SS58 addresses can map to H160/Ethereum format

---

## SS58 Address Structure

```
┌─────────────┬──────────────────────────┬──────────────┐
│   Prefix    │      Public Key Hash     │   Checksum   │
│   1-2 bytes │       32 bytes           │   2 bytes    │
└─────────────┴──────────────────────────┴──────────────┘
        ↓                  ↓                      ↓
   Determines        Account Identity      Error Detection
   Network ID        (Same across all      (Blake2b hash)
                      networks)
```

**Example - Same Account, Different Networks:**

```typescript
// Generic Substrate (prefix 42)
5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

// Polkadot (prefix 0)
15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5

// Kusama (prefix 2)
FJscMKS4kSH1gG3FKJCcZhcTKLg4gNgYVKPXRE9gzVUb9pW

// Westend (prefix 42)
5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

// EVM/H160 (0x...)
0x1234567890123456789012345678901234567890
```

**All of these addresses represent THE SAME ACCOUNT** - just formatted for different networks.

---

## Network Prefixes - Complete List

| Network | Prefix | Address Starts With | Example |
|---------|--------|---------------------|---------|
| **Polkadot** | 0 | `1` | `15oF4uVJwmo4TdGW7...` |
| **Kusama** | 2 | `C`, `D`, `F`, `G`, `H`, `J` | `FJscMKS4kSH1gG3F...` |
| **Generic Substrate** | 42 | `5` | `5GrwvaEF5zXb26Fz...` |
| **Polkadot Asset Hub** | 0 | `1` | `15oF4uVJwmo4TdGW7...` |
| **Kusama Asset Hub** | 2 | `C`, `D`, `F`, `G`, `H`, `J` | `FJscMKS4kSH1gG3F...` |
| **Westend** | 42 | `5` | `5GrwvaEF5zXb26Fz...` |
| **Paseo (testnet)** | 42 | `5` | `5GrwvaEF5zXb26Fz...` |
| **Rococo** | 42 | `5` | `5GrwvaEF5zXb26Fz...` |
| **Acala** | 10 | `2` | `23M5ttkmR6Kco...` |
| **Moonbeam** | 1284 | `5` (starts differently) | `5ELRpquT7C3m...` |
| **Astar** | 5 | `W`, `X`, `Y`, `Z` | `WQW3jPZ8Jf8UL...` |
| **Phala** | 30 | `4` | `43Zq8JrwMWaB...` |
| **Bifrost** | 6 | `d`, `e`, `f`, `g` | `eCSrvbA5gGNY...` |

### How to Determine Network from Address

```typescript
function detectNetwork(address: string): string {
  const firstChar = address[0]

  if (firstChar === "1") return "Polkadot / Polkadot Asset Hub"
  if (firstChar === "5") return "Generic Substrate / Westend / Paseo"
  if (["C", "D", "F", "G", "H", "J"].includes(firstChar)) return "Kusama / Kusama Asset Hub"
  if (firstChar === "2") return "Acala"
  if (["W", "X", "Y", "Z"].includes(firstChar)) return "Astar"
  if (firstChar === "4") return "Phala"
  if (["d", "e", "f", "g"].includes(firstChar)) return "Bifrost"
  if (address.startsWith("0x")) return "EVM/H160 (Ethereum-compatible)"

  return "Unknown network"
}
```

---

## Address Type Recognition

### 1. SS58 Format (Substrate Native)

**Pattern:** Base58 string, 47-48 characters, starts with network-specific character

```typescript
// Examples
"5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" // Generic (42)
"15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5" // Polkadot (0)
"FJscMKS4kSH1gG3FKJCcZhcTKLg4gNgYVKPXRE9gzVUb9pW"  // Kusama (2)
```

**Detection:**
```typescript
function isSS58Address(address: string): boolean {
  // 47-48 characters, Base58 encoded, no 0OIl characters
  const ss58Regex = /^[1-9A-HJ-NP-Za-km-z]{47,48}$/
  return ss58Regex.test(address)
}
```

### 2. EVM/H160 Format (Ethereum-compatible)

**Pattern:** Hex string with `0x` prefix, exactly 42 characters (20 bytes)

```typescript
// Examples
"0x1234567890123456789012345678901234567890"
"0xd43593c715fdd31c61141abd04a99fd6822c8558"
"0xa318e012c3AEd73dFcFfd4E3EdC272e867767B0A"
```

**Detection:**
```typescript
function isEvmAddress(address: string): boolean {
  // 0x prefix + 40 hex characters
  const evmRegex = /^0x[0-9a-fA-F]{40}$/
  return evmRegex.test(address)
}
```

### 3. Raw Public Key (Hex)

**Pattern:** Hex string, 64 characters (32 bytes), no `0x` prefix

```typescript
// Example
"d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"
```

---

## Address Conversion

### Converting Between Networks (SS58)

```typescript
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto"

/**
 * Convert address to any network format
 */
function convertToNetwork(address: string, targetPrefix: number): string | null {
  try {
    // Decode extracts the public key (network-agnostic)
    const publicKey = decodeAddress(address)

    // Encode with target network prefix
    return encodeAddress(publicKey, targetPrefix)
  } catch (error) {
    console.error("Invalid address:", error)
    return null
  }
}

// Examples
const genericAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

const polkadotAddress = convertToNetwork(genericAddress, 0)  // Polkadot
// => "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5"

const kusamaAddress = convertToNetwork(genericAddress, 2)    // Kusama
// => "FJscMKS4kSH1gG3FKJCcZhcTKLg4gNgYVKPXRE9gzVUb9pW"
```

### Converting SS58 to EVM/H160

```typescript
import { addressToEvm } from "@polkadot/util-crypto"

/**
 * Convert Substrate SS58 address to Ethereum H160 format
 * Uses truncated hash of the public key
 */
function ss58ToEvm(ss58Address: string): string {
  try {
    // addressToEvm returns Uint8Array (20 bytes)
    const evmBytes = addressToEvm(ss58Address)

    // Convert to hex string with 0x prefix
    const evmHex = "0x" + Array.from(evmBytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")

    return evmHex
  } catch (error) {
    throw new Error(`Failed to convert SS58 to EVM: ${error}`)
  }
}

// Example
const ss58 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const evm = ss58ToEvm(ss58)
// => "0xd43593c715fdd31c61141abd04a99fd6822c8558"
```

**Important:** SS58 → EVM conversion is **one-way** and **lossy**. You cannot convert back from EVM to SS58 without the original public key.

### Converting EVM to SS58 (Mirror Accounts)

Some parachains (like Asset Hub) create "mirror accounts" where EVM addresses can interact:

```typescript
import { evmToAddress } from "@polkadot/util-crypto"

/**
 * Convert EVM address to SS58 mirror account
 * Only works on chains with EVM compatibility
 */
function evmToSS58(evmAddress: string, prefix: number = 42): string {
  try {
    // Remove 0x prefix if present
    const cleanHex = evmAddress.startsWith("0x")
      ? evmAddress.slice(2)
      : evmAddress

    // Convert hex to Uint8Array
    const bytes = new Uint8Array(
      cleanHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    )

    // Use evmToAddress to create mirror account
    const ss58 = evmToAddress(bytes, prefix)
    return ss58
  } catch (error) {
    throw new Error(`Failed to convert EVM to SS58: ${error}`)
  }
}

// Example
const evm = "0x1234567890123456789012345678901234567890"
const mirror = evmToSS58(evm, 42)
// => Mirror account on Generic Substrate format
```

---

## Address Validation

### Comprehensive Validation Function

```typescript
import { decodeAddress } from "@polkadot/util-crypto"

interface AddressValidation {
  valid: boolean
  type: "ss58" | "evm" | "hex" | "unknown"
  network?: string
  error?: string
}

function validateAddress(address: string): AddressValidation {
  // Check if empty
  if (!address || address.trim() === "") {
    return { valid: false, type: "unknown", error: "Empty address" }
  }

  // Check for EVM format
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return { valid: true, type: "evm", network: "EVM/Ethereum-compatible" }
  }

  // Check for raw hex (public key)
  if (/^[0-9a-fA-F]{64}$/.test(address)) {
    return { valid: true, type: "hex", network: "Raw Public Key" }
  }

  // Check for SS58 format
  try {
    decodeAddress(address)
    const firstChar = address[0]
    let network = "Unknown"

    if (firstChar === "1") network = "Polkadot"
    else if (firstChar === "5") network = "Generic Substrate"
    else if (["C", "D", "F", "G", "H", "J"].includes(firstChar)) network = "Kusama"
    else if (firstChar === "2") network = "Acala"
    else if (["W", "X", "Y", "Z"].includes(firstChar)) network = "Astar"

    return { valid: true, type: "ss58", network }
  } catch (error) {
    return {
      valid: false,
      type: "unknown",
      error: "Invalid SS58 format"
    }
  }
}

// Examples
validateAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
// => { valid: true, type: "ss58", network: "Generic Substrate" }

validateAddress("0x1234567890123456789012345678901234567890")
// => { valid: true, type: "evm", network: "EVM/Ethereum-compatible" }

validateAddress("invalid")
// => { valid: false, type: "unknown", error: "Invalid SS58 format" }
```

---

## Address Display Formatting

### 1. Shortened Display (UI)

```typescript
/**
 * Shorten address for display
 * Example: "5Gw3s...7Xt4" or "0x1234...5678"
 */
function shortenAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (address.length <= startChars + endChars) {
    return address
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

// Examples
shortenAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY")
// => "5GrwvaEF...utQY"

shortenAddress("0x1234567890123456789012345678901234567890", 8, 6)
// => "0x123456...567890"
```

### 2. Identicon Display

```typescript
import Identicon from "@polkadot/react-identicon"

function AddressWithIdenticon({ address }: { address: string }) {
  return (
    <div className="flex items-center gap-2">
      <Identicon value={address} size={32} theme="polkadot" />
      <span className="font-mono">{shortenAddress(address)}</span>
    </div>
  )
}
```

### 3. Network Badge Display

```typescript
function AddressWithNetwork({ address }: { address: string }) {
  const network = detectNetwork(address)
  const type = address.startsWith("0x") ? "evm" : "ss58"

  return (
    <div className="flex items-center gap-2">
      <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-500">
        {network}
      </span>
      <span className={`font-mono ${type === "evm" ? "text-green-500" : ""}`}>
        {shortenAddress(address)}
      </span>
    </div>
  )
}
```

### 4. Multi-Format Display

```typescript
interface AddressDisplayProps {
  address: string
  showFormats?: ("ss58" | "evm" | "polkadot" | "kusama")[]
}

function MultiFormatAddressDisplay({
  address,
  showFormats = ["ss58", "evm"]
}: AddressDisplayProps) {
  const formats = {
    ss58: address,
    evm: ss58ToEvm(address),
    polkadot: convertToNetwork(address, 0),
    kusama: convertToNetwork(address, 2),
  }

  return (
    <div className="space-y-2">
      {showFormats.map(format => (
        <div key={format} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-20">
            {format.toUpperCase()}
          </span>
          <code className="text-xs font-mono bg-secondary px-2 py-1 rounded">
            {formats[format]}
          </code>
        </div>
      ))}
    </div>
  )
}
```

---

## Practical Implementation Examples

### Complete Address Utility Module

<details>
<summary><code>lib/utils/address-utils.ts</code></summary>

```typescript
import {
  encodeAddress,
  decodeAddress,
  addressToEvm
} from "@polkadot/util-crypto"

// Network prefix constants
export const NETWORK_PREFIXES = {
  POLKADOT: 0,
  KUSAMA: 2,
  GENERIC: 42,
  WESTEND: 42,
  PASEO: 42,
  ACALA: 10,
  MOONBEAM: 1284,
  ASTAR: 5,
  PHALA: 30,
  BIFROST: 6,
} as const

// Address type detection
export type AddressType = "ss58" | "evm" | "hex" | "unknown"

export interface AddressInfo {
  original: string
  type: AddressType
  valid: boolean
  network?: string
  normalized?: string
  evm?: string
  error?: string
}

/**
 * Analyze address and return comprehensive information
 */
export function analyzeAddress(address: string): AddressInfo {
  const info: AddressInfo = {
    original: address,
    type: "unknown",
    valid: false,
  }

  // Empty check
  if (!address || address.trim() === "") {
    info.error = "Empty address"
    return info
  }

  // EVM format check
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
    info.type = "evm"
    info.valid = true
    info.network = "EVM/Ethereum-compatible"
    return info
  }

  // Raw hex check
  if (/^[0-9a-fA-F]{64}$/.test(address)) {
    info.type = "hex"
    info.valid = true
    info.network = "Raw Public Key"
    return info
  }

  // SS58 format check
  try {
    const publicKey = decodeAddress(address)
    const normalized = encodeAddress(publicKey, NETWORK_PREFIXES.GENERIC)
    const evm = addressToEvm(publicKey)
    const evmHex = "0x" + Array.from(evm)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")

    info.type = "ss58"
    info.valid = true
    info.normalized = normalized
    info.evm = evmHex
    info.network = detectNetworkFromPrefix(address[0])

    return info
  } catch (error) {
    info.error = "Invalid address format"
    return info
  }
}

/**
 * Detect network from first character
 */
function detectNetworkFromPrefix(firstChar: string): string {
  if (firstChar === "1") return "Polkadot / Asset Hub"
  if (firstChar === "5") return "Generic Substrate / Westend / Paseo"
  if (["C", "D", "F", "G", "H", "J"].includes(firstChar)) return "Kusama / Asset Hub"
  if (firstChar === "2") return "Acala"
  if (["W", "X", "Y", "Z"].includes(firstChar)) return "Astar"
  if (firstChar === "4") return "Phala"
  if (["d", "e", "f", "g"].includes(firstChar)) return "Bifrost"
  return "Unknown"
}

/**
 * Normalize address to specific network
 */
export function normalizeAddress(
  address: string,
  targetPrefix: number = NETWORK_PREFIXES.GENERIC
): string | null {
  try {
    const publicKey = decodeAddress(address)
    return encodeAddress(publicKey, targetPrefix)
  } catch {
    return null
  }
}

/**
 * Convert SS58 to EVM format
 */
export function toEvmAddress(ss58Address: string): string | null {
  try {
    const evmBytes = addressToEvm(ss58Address)
    return "0x" + Array.from(evmBytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
  } catch {
    return null
  }
}

/**
 * Validate if address is valid SS58
 */
export function isValidSS58(address: string): boolean {
  try {
    decodeAddress(address)
    return true
  } catch {
    return false
  }
}

/**
 * Validate if address is valid EVM
 */
export function isValidEVM(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

/**
 * Check if two addresses represent the same account
 */
export function isSameAccount(address1: string, address2: string): boolean {
  try {
    // Both SS58 - compare public keys
    if (isValidSS58(address1) && isValidSS58(address2)) {
      const pk1 = decodeAddress(address1)
      const pk2 = decodeAddress(address2)
      return Buffer.from(pk1).equals(Buffer.from(pk2))
    }

    // Both EVM - direct comparison
    if (isValidEVM(address1) && isValidEVM(address2)) {
      return address1.toLowerCase() === address2.toLowerCase()
    }

    // Mixed - convert SS58 to EVM and compare
    if (isValidSS58(address1) && isValidEVM(address2)) {
      const evm1 = toEvmAddress(address1)
      return evm1?.toLowerCase() === address2.toLowerCase()
    }

    if (isValidEVM(address1) && isValidSS58(address2)) {
      const evm2 = toEvmAddress(address2)
      return address1.toLowerCase() === evm2?.toLowerCase()
    }

    return false
  } catch {
    return false
  }
}

/**
 * Format address for display
 */
export function formatAddress(
  address: string,
  length: "short" | "medium" | "long" | "full" = "short"
): string {
  const lengths = {
    short: { start: 6, end: 4 },
    medium: { start: 10, end: 8 },
    long: { start: 16, end: 12 },
    full: { start: address.length, end: 0 },
  }

  const { start, end } = lengths[length]

  if (address.length <= start + end) {
    return address
  }

  return end > 0
    ? `${address.slice(0, start)}...${address.slice(-end)}`
    : address
}
```

</details>

---

## React Components

### Address Display Component

<details>
<summary><code>components/address-display.tsx</code></summary>

```typescript
"use client"

import { useState } from "react"
import { Copy, Check, ExternalLink } from "lucide-react"
import { analyzeAddress, formatAddress } from "@/lib/utils/address-utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AddressDisplayProps {
  address: string
  format?: "short" | "medium" | "long" | "full"
  showCopy?: boolean
  showExplorer?: boolean
  showNetwork?: boolean
  explorerUrl?: string
}

export function AddressDisplay({
  address,
  format = "short",
  showCopy = true,
  showExplorer = false,
  showNetwork = false,
  explorerUrl,
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false)
  const info = analyzeAddress(address)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getTypeColor = () => {
    if (!info.valid) return "text-red-500"
    switch (info.type) {
      case "ss58": return "text-blue-500"
      case "evm": return "text-green-500"
      case "hex": return "text-yellow-500"
      default: return "text-gray-500"
    }
  }

  return (
    <div className="flex items-center gap-2">
      {showNetwork && info.network && (
        <span className="px-2 py-1 text-xs rounded bg-secondary">
          {info.network}
        </span>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <code className={`font-mono text-sm ${getTypeColor()}`}>
            {formatAddress(address, format)}
          </code>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-mono text-xs break-all">{address}</div>
            {info.type === "ss58" && info.evm && (
              <div className="text-xs text-muted-foreground">
                EVM: {formatAddress(info.evm, "short")}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {showCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      )}

      {showExplorer && explorerUrl && (
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-6 w-6 p-0"
        >
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </div>
  )
}
```

</details>

---

## Common Patterns in Your Project

Based on your codebase analysis:

### Pattern 1: Normalize to Generic Format (Prefix 42)

```typescript
// Used in: lib/utils/address.ts
const SUBSTRATE_SS58_PREFIX = 42

function normalizeToAssetHubAddress(address: string): string {
  try {
    const publicKey = decodeAddress(address)
    return encodeAddress(publicKey, SUBSTRATE_SS58_PREFIX)
  } catch (error) {
    console.error("Failed to normalize address:", error)
    return address
  }
}
```

**Why Prefix 42?**
- Universal/generic format
- Works across most Substrate chains
- Paseo testnet uses prefix 42
- Consistent display format starting with "5"

### Pattern 2: Convert SS58 to EVM for Smart Contracts

```typescript
// Used in: lib/hooks/use-transaction-log.ts
import { addressToEvm } from "@polkadot/util-crypto"

function convertToEvmAddress(address: string): string {
  if (address.startsWith("0x")) {
    return ethers.getAddress(address) // Normalize if already EVM
  }

  // Convert SS58 to EVM H160
  const evmBytes = addressToEvm(address)
  const evmHex = "0x" + Array.from(evmBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")

  return ethers.getAddress(evmHex) // Checksum format
}
```

**When to Use:**
- Storing addresses in EVM smart contracts
- Interacting with PolkaVM contracts
- Indexing in Ethereum-style systems

### Pattern 3: Store Both Formats

```typescript
// Used in: lib/storage/types.ts
interface Transaction {
  // Display format (SS58 prefix 42)
  customer: string          // "5GrwvaEF5zXb26Fz..."
  merchant: string          // "5FHneW46xGXgs5m..."

  // Original blockchain format (normalized for comparison)
  originalCustomer: string  // "5GrwvaEF5zXb26Fz..." (prefix 0 or 42)
  originalMerchant: string  // "5FHneW46xGXgs5m..." (prefix 0 or 42)
}
```

**Best Practice:**
- Store user-facing addresses in consistent format (prefix 42)
- Store original blockchain addresses for verification
- Index/query using normalized format
- Display with network context

---

## Testing Address Functions

```typescript
// Test suite for address utilities
describe("Address Utilities", () => {
  const testAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

  test("analyzeAddress identifies SS58", () => {
    const info = analyzeAddress(testAddress)
    expect(info.valid).toBe(true)
    expect(info.type).toBe("ss58")
    expect(info.network).toContain("Generic")
  })

  test("converts to different networks", () => {
    const polkadot = normalizeAddress(testAddress, 0)
    expect(polkadot).toMatch(/^1/)

    const kusama = normalizeAddress(testAddress, 2)
    expect(kusama).toMatch(/^[CDFGHJ]/)
  })

  test("converts to EVM format", () => {
    const evm = toEvmAddress(testAddress)
    expect(evm).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  test("recognizes same account across formats", () => {
    const polkadot = normalizeAddress(testAddress, 0)!
    const kusama = normalizeAddress(testAddress, 2)!

    expect(isSameAccount(testAddress, polkadot)).toBe(true)
    expect(isSameAccount(polkadot, kusama)).toBe(true)
  })

  test("formats address for display", () => {
    expect(formatAddress(testAddress, "short")).toBe("5GrwvaEF...utQY")
    expect(formatAddress(testAddress, "full")).toBe(testAddress)
  })
})
```

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════════╗
║                 Polkadot Address Quick Reference             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  SS58 Format (Substrate Native)                             ║
║  ├─ Polkadot (0):    1xxxxx...                              ║
║  ├─ Kusama (2):      C/D/F/G/H/Jxxxxx...                    ║
║  ├─ Generic (42):    5xxxxx...                              ║
║  └─ Paseo (42):      5xxxxx...                              ║
║                                                              ║
║  EVM Format (H160)                                           ║
║  └─ Ethereum-style:  0x1234567890...                        ║
║                                                              ║
║  ⚠️  Same public key → Different SS58 addresses              ║
║  ⚠️  SS58 → EVM is one-way (lossy conversion)                ║
║  ✓  Use prefix 42 for consistent display                    ║
║  ✓  Store both SS58 and EVM for cross-chain apps            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Resources

- [SS58 Address Format Specification](https://github.com/paritytech/substrate/wiki/External-Address-Format-(SS58))
- [Polkadot.js Address Utilities](https://polkadot.js.org/docs/util-crypto/examples/create-mnemonic)
- [Substrate Address Generator](https://polkadot.subscan.io/tools/ss58_transform)
- [Network Prefix Registry](https://github.com/paritytech/ss58-registry)

---

**Last Updated:** 2026-02-08
