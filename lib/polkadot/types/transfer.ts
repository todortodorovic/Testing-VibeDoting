export interface TransferParams {
  to: string
  amount: bigint
}

export interface TransferResult {
  txHash: string
  blockHash?: string
  blockNumber?: number
  status: TransactionStatus
}

export enum TransactionStatus {
  Pending = "pending",
  InBlock = "in-block",
  Finalized = "finalized",
  Failed = "failed",
}

export interface Balance {
  free: bigint
  reserved: bigint
  frozen: bigint
  transferable: bigint
  decimals: number
  symbol: string
}

export interface FeeEstimate {
  estimatedFee: bigint
  formattedFee: string
  canAfford: boolean
}
