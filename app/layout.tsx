import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Web3Provider } from "@/lib/web3"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Polkadot Wallet Demo",
  description: "Demo of Polkadot wallet connection system",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  )
}
