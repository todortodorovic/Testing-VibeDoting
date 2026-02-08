export enum TransactionStatus {
  // Initial states
  Preparing = "preparing",
  Signing = "signing",

  // Broadcast states
  Broadcasting = "broadcasting",
  Broadcasted = "broadcasted",

  // Block states
  InBlock = "in-block",
  Finalized = "finalized",

  // Error states
  Failed = "failed",

  // User actions
  Cancelled = "cancelled",
}

export interface TransactionEvent {
  type: "broadcasted" | "txBestBlocksState" | "finalized"
  timestamp: number
  blockHash?: string
  blockNumber?: number
  txHash?: string
}

export interface TransactionInfo {
  txHash?: string
  status: TransactionStatus
  blockHash?: string
  blockNumber?: number
  confirmations: number
  events: TransactionEvent[]
  error?: string
  timestamp: number
  fromAddress: string
  toAddress: string
  amount: bigint
  fee?: bigint
}
