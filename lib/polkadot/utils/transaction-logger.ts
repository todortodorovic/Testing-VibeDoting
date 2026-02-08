import { TransactionStatus, TransactionEvent, TransactionInfo } from "../types/transaction-tracker"

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // Status colors
  info: "\x1b[36m",      // Cyan
  success: "\x1b[32m",   // Green
  warning: "\x1b[33m",   // Yellow
  error: "\x1b[31m",     // Red

  // Specific colors
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
}

export class TransactionLogger {
  private enabled: boolean

  constructor(enabled = true) {
    this.enabled = enabled
  }

  private log(color: string, icon: string, title: string, data?: Record<string, any>) {
    if (!this.enabled) return

    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1)

    console.log(
      `\n${color}${COLORS.bright}${icon} ${title}${COLORS.reset}`
    )
    console.log(`${COLORS.dim}${timestamp}${COLORS.reset}`)

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        console.log(`  ${COLORS.dim}${key}:${COLORS.reset}`, value)
      })
    }
    console.log("")
  }

  preparing(fromAddress: string, toAddress: string, amount: string) {
    this.log(COLORS.info, "⚙️", "Preparing Transaction", {
      From: fromAddress,
      To: toAddress,
      Amount: amount,
    })
  }

  signing() {
    this.log(COLORS.warning, "✍️", "Awaiting Signature", {
      Status: "Wallet popup opened",
      Action: "Please approve in your wallet",
    })
  }

  broadcasting() {
    this.log(COLORS.info, "📡", "Broadcasting Transaction", {
      Status: "Submitting to network",
    })
  }

  broadcasted(txHash: string) {
    this.log(COLORS.success, "✅", "Transaction Broadcasted", {
      "Transaction Hash": txHash,
      Status: "Waiting for block inclusion",
    })
  }

  inBlock(txHash: string, blockHash: string, blockNumber: number) {
    this.log(COLORS.blue, "📦", "Transaction In Block", {
      "Transaction Hash": txHash,
      "Block Hash": blockHash,
      "Block Number": `#${blockNumber}`,
      Confirmations: 1,
      Status: "Waiting for finalization",
    })
  }

  finalized(txHash: string, blockHash: string, blockNumber: number, confirmations: number) {
    this.log(COLORS.success, "🎉", "Transaction Finalized", {
      "Transaction Hash": txHash,
      "Block Hash": blockHash,
      "Block Number": `#${blockNumber}`,
      Confirmations: confirmations,
      Status: "✓ Complete",
    })
  }

  error(error: Error | string) {
    this.log(COLORS.error, "💥", "Transaction Error", {
      Error: typeof error === "string" ? error : error.message,
      Stack: typeof error === "object" ? error.stack : undefined,
    })
  }

  cancelled() {
    this.log(COLORS.warning, "🚫", "Transaction Cancelled", {
      Reason: "User cancelled in wallet",
    })
  }

  summary(tx: TransactionInfo) {
    console.group(
      `${COLORS.bright}${COLORS.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`
    )
    console.log(`${COLORS.bright}Transaction Summary${COLORS.reset}`)
    console.log("")
    console.log("Status:", this.getStatusEmoji(tx.status), tx.status)
    if (tx.txHash) console.log("Hash:", tx.txHash)
    if (tx.blockHash) console.log("Block Hash:", tx.blockHash)
    if (tx.blockNumber) console.log("Block Number:", `#${tx.blockNumber}`)
    console.log("Confirmations:", tx.confirmations)
    console.log("Events:", tx.events.length)
    console.log("Duration:", `${Date.now() - tx.timestamp}ms`)
    if (tx.error) console.log(`${COLORS.error}Error:${COLORS.reset}`, tx.error)
    console.groupEnd()
    console.log(
      `${COLORS.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`
    )
  }

  private getStatusEmoji(status: TransactionStatus): string {
    switch (status) {
      case TransactionStatus.Preparing:
        return "⚙️"
      case TransactionStatus.Signing:
        return "✍️"
      case TransactionStatus.Broadcasting:
      case TransactionStatus.Broadcasted:
        return "📡"
      case TransactionStatus.InBlock:
        return "📦"
      case TransactionStatus.Finalized:
        return "🎉"
      case TransactionStatus.Failed:
        return "❌"
      case TransactionStatus.Cancelled:
        return "🚫"
      default:
        return "❓"
    }
  }

  timeline(events: TransactionEvent[]) {
    console.group(`${COLORS.bright}${COLORS.blue}Transaction Timeline${COLORS.reset}`)
    events.forEach((event, index) => {
      const time = new Date(event.timestamp).toISOString().split("T")[1].slice(0, -1)
      console.log(
        `${COLORS.dim}${index + 1}.${COLORS.reset} ${time} - ${event.type}`,
        event.blockNumber ? `(Block #${event.blockNumber})` : ""
      )
    })
    console.groupEnd()
  }
}
