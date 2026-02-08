export function formatBalance(
  amount: bigint,
  decimals: number,
  symbol?: string
): string {
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const remainder = amount % divisor

  const wholeStr = whole.toString()
  const remainderStr = remainder.toString().padStart(decimals, "0")

  const trimmed = remainderStr.replace(/0+$/, "")
  const formatted = trimmed ? `${wholeStr}.${trimmed}` : wholeStr

  return symbol ? `${formatted} ${symbol}` : formatted
}

export function formatBalanceShort(
  amount: bigint,
  decimals: number,
  symbol?: string
): string {
  const formatted = formatBalance(amount, decimals)
  const [whole, fraction] = formatted.split(".")

  const shortFraction = fraction ? fraction.slice(0, 4) : ""
  const short = shortFraction ? `${whole}.${shortFraction}` : whole

  return symbol ? `${short} ${symbol}` : short
}
