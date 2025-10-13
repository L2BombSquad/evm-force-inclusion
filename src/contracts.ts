import { parseAbi } from "viem";

export const ARBITRUM_INBOX_ABI = parseAbi([
  "function createRetryableTicket(address to,uint256 l2CallValue,uint256 maxSubmissionCost,address excessFeeRefundAddress,address callValueRefundAddress,uint256 maxGas,uint256 gasPriceBid,bytes data) payable returns (uint256)",
]);

export const OPTIMISM_PORTAL_ABI = parseAbi([
  "function depositTransaction(address to,uint256 value,uint64 gasLimit,bool isCreation,bytes data) payable",
]);
