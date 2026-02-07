"use client"

import { WalletProviderType } from "@/lib/web3/types/web3"
import { cn } from "@/lib/utils"

interface AccountAvatarProps {
  address: string
  size?: number
  className?: string
  provider?: WalletProviderType
}

export function AccountAvatar({
  address,
  size = 40,
  className,
  provider,
}: AccountAvatarProps) {
  // Simple gradient avatar based on address
  const colors = [
    "from-blue-500 to-purple-500",
    "from-green-500 to-teal-500",
    "from-orange-500 to-red-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
  ]

  const colorIndex = address.charCodeAt(0) % colors.length
  const gradientClass = colors[colorIndex]

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold",
        gradientClass,
        className
      )}
      style={{ width: size, height: size, fontSize: size / 3 }}
    >
      {address.slice(0, 2).toUpperCase()}
    </div>
  )
}
