import type { BigNumberish, ContractTransactionResponse, Signer } from "ethers";

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
  ): Promise<ContractTransactionResponse>;
}

export interface OptimismPortalContract {
  depositTransaction(
    to: string,
    value: BigNumberish,
    gasLimit: BigNumberish,
    isCreation: boolean,
    data: HexData,
    overrides?: { value: BigNumberish }
  ): Promise<ContractTransactionResponse>;
}

export interface ForceInclusionContractFactories {
  createArbitrumInbox(address: string, signer: Signer): ArbitrumInboxContract;
  createOptimismPortal(address: string, signer: Signer): OptimismPortalContract;
}

export interface ForceInclusionContractOverride<TContract> {
  address?: string;
  factory?: (address: string, signer: Signer) => TContract;
}

export interface ForceInclusionContractOverrides {
  arbitrumInbox?: ForceInclusionContractOverride<ArbitrumInboxContract>;
  optimismPortal?: ForceInclusionContractOverride<OptimismPortalContract>;
}

export interface ForceInclusionClientConfig {
  signer: Signer;
  arbitrumInboxAddress?: string;
  optimismPortalAddress?: string;
  factories?: Partial<ForceInclusionContractFactories>;
  contracts?: ForceInclusionContractOverrides;
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
