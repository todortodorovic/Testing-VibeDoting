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
      if (pk1.length !== pk2.length) return false
      return pk1.every((byte, i) => byte === pk2[i])
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
