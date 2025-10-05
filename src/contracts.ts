export const ARBITRUM_INBOX_ABI = [
  "function createRetryableTicket(address to,uint256 l2CallValue,uint256 maxSubmissionCost,address excessFeeRefundAddress,address callValueRefundAddress,uint256 maxGas,uint256 gasPriceBid,bytes data) payable returns (uint256)"
] as const;

export const OPTIMISM_PORTAL_ABI = [
  "function depositTransaction(address to,uint256 value,uint64 gasLimit,bool isCreation,bytes data) payable"
] as const;
