import type { Hash, WalletClient } from "viem";

export type BigNumberish = bigint | number | string;

export type HexData = `0x${string}`;

export interface ArbitrumInboxContract {
  createRetryableTicket(
    to: string,
    l2CallValue: BigNumberish,
    maxSubmissionCost: BigNumberish,
    excessFeeRefundAddress: string,
    callValueRefundAddress: string,
    maxGas: BigNumberish,
    gasPriceBid: BigNumberish,
    data: HexData,
    overrides?: { value: BigNumberish }
  ): Promise<Hash>;
}

export interface OptimismPortalContract {
  depositTransaction(
    to: string,
    value: BigNumberish,
    gasLimit: BigNumberish,
    isCreation: boolean,
    data: HexData,
    overrides?: { value: BigNumberish }
  ): Promise<Hash>;
}

export interface ForceInclusionContractFactories {
  createArbitrumInbox(address: string, walletClient: WalletClient): ArbitrumInboxContract;
  createOptimismPortal(address: string, walletClient: WalletClient): OptimismPortalContract;
}

export interface ForceInclusionContractOverride<TContract> {
  address?: string;
  factory?: (address: string, walletClient: WalletClient) => TContract;
}

export interface ForceInclusionContractOverrides {
  arbitrumInbox?: ForceInclusionContractOverride<ArbitrumInboxContract>;
  optimismPortal?: ForceInclusionContractOverride<OptimismPortalContract>;
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface CoreOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  logger?: Logger;
}

export interface ForceInclusionClientConfig {
  walletClient: WalletClient;
  arbitrumInboxAddress?: string;
  optimismPortalAddress?: string;
  factories?: Partial<ForceInclusionContractFactories>;
  contracts?: ForceInclusionContractOverrides;
  core?: CoreOptions;
}

export type ForceInclusionLayerType = "arb" | "op";

interface BaseForceInclusionRequest {
  to: string;
  data?: HexData;
}

export interface ArbitrumTransactionRequest extends BaseForceInclusionRequest {
  l2: {
    type: "arb";
    l1ContractAddress: string;
  };
  l2CallValue: BigNumberish;
  maxSubmissionCost: BigNumberish;
  maxGas: BigNumberish;
  gasPriceBid: BigNumberish;
  excessFeeRefundAddress?: string;
  callValueRefundAddress?: string;
}

export interface OptimismTransactionRequest extends BaseForceInclusionRequest {
  l2: {
    type: "op";
    l1ContractAddress: string;
  };
  value: BigNumberish;
  gasLimit: BigNumberish;
  isCreation?: boolean;
}

export type ForceInclusionTransactionRequest =
  | ArbitrumTransactionRequest
  | OptimismTransactionRequest;

export interface ArbitrumRetryableTicketRequest {
  to: string;
  l2CallValue: BigNumberish;
  maxSubmissionCost: BigNumberish;
  maxGas: BigNumberish;
  gasPriceBid: BigNumberish;
  data?: HexData;
  excessFeeRefundAddress?: string;
  callValueRefundAddress?: string;
  inboxAddress?: string;
}

export interface OptimismDepositRequest {
  to: string;
  value: BigNumberish;
  gasLimit: BigNumberish;
  data?: HexData;
  isCreation?: boolean;
  portalAddress?: string;
}

export type Address = `0x${string}` | string;

export type Token =
  | { type: "native"; symbol: string } // e.g. { type: 'native', symbol: 'ETH' }
  | { type: "erc20"; address: Address; symbol?: string };

export interface ForceExitRequest {
  rollup: string; // e.g., 'op', 'arb', 'zksync'
  token: Token;
  amount: string; // human-readable amount (adapter decides decimals)
  userAddress: Address;
  // Optional adapter-specific hints
  options?: Record<string, unknown>;
}
