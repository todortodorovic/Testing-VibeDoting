export function parseAmount(input: string, decimals: number): bigint | null {
  if (!input || input === "") return null

  try {
    const cleaned = input.replace(/[^\d.]/g, "")
    const [whole, fraction = ""] = cleaned.split(".")

    if (whole === "" && fraction === "") return null

    const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals)
    const combined = (whole || "0") + paddedFraction
    return BigInt(combined)
  } catch {
    return null
  }
}

export function validateAmount(input: string): boolean {
  return /^\d*\.?\d*$/.test(input)
}
