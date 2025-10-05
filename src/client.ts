import { Contract, JsonRpcProvider, Wallet } from "ethers";
import type { ContractTransactionResponse, Signer } from "ethers";

import { DEFAULT_ARBITRUM_INBOX_ADDRESS, DEFAULT_OPTIMISM_PORTAL_ADDRESS } from "./constants.js";
import { ARBITRUM_INBOX_ABI, OPTIMISM_PORTAL_ABI } from "./contracts.js";
import type {
  ArbitrumInboxContract,
  ArbitrumRetryableTicketRequest,
  ArbitrumTransactionRequest,
  ForceInclusionClientConfig,
  ForceInclusionContractFactories,
  ForceInclusionTransactionRequest,
  OptimismDepositRequest,
  OptimismTransactionRequest,
  OptimismPortalContract,
} from "./types.js";
import { normalizeHexData, toBigInt } from "./utils.js";

const defaultFactories: ForceInclusionContractFactories = {
  createArbitrumInbox: (address: string, signer: Signer) =>
    new Contract(address, ARBITRUM_INBOX_ABI, signer) as unknown as ArbitrumInboxContract,
  createOptimismPortal: (address: string, signer: Signer) =>
    new Contract(address, OPTIMISM_PORTAL_ABI, signer) as unknown as OptimismPortalContract,
};

export class ForceInclusionClient {
  private readonly signer: Signer;
  private readonly arbitrumInboxAddress: string;
  private readonly optimismPortalAddress: string;
  private readonly factories: ForceInclusionContractFactories;
  private readonly arbitrumCache = new Map<string, ArbitrumInboxContract>();
  private readonly optimismCache = new Map<string, OptimismPortalContract>();

  constructor(config: ForceInclusionClientConfig) {
    this.signer = config.signer;
    const arbitrumContracts = config.contracts?.arbitrumInbox ?? {};
    const optimismContracts = config.contracts?.optimismPortal ?? {};

    const resolvedArbitrumAddress =
      arbitrumContracts.address ?? config.arbitrumInboxAddress ?? DEFAULT_ARBITRUM_INBOX_ADDRESS;
    const resolvedOptimismAddress =
      optimismContracts.address ?? config.optimismPortalAddress ?? DEFAULT_OPTIMISM_PORTAL_ADDRESS;

    this.arbitrumInboxAddress = resolvedArbitrumAddress.toLowerCase();
    this.optimismPortalAddress = resolvedOptimismAddress.toLowerCase();
    this.factories = {
      createArbitrumInbox:
        arbitrumContracts.factory ??
        config.factories?.createArbitrumInbox ??
        defaultFactories.createArbitrumInbox,
      createOptimismPortal:
        optimismContracts.factory ??
        config.factories?.createOptimismPortal ??
        defaultFactories.createOptimismPortal,
    };
  }

  async createArbitrumRetryableTicket(
    request: ArbitrumRetryableTicketRequest
  ): Promise<ContractTransactionResponse> {
    const inbox = this.getArbitrumInbox((request.inboxAddress ?? this.arbitrumInboxAddress).toLowerCase());

    const l2CallValue = toBigInt(request.l2CallValue, "l2CallValue");
    const maxSubmissionCost = toBigInt(request.maxSubmissionCost, "maxSubmissionCost");
    const maxGas = toBigInt(request.maxGas, "maxGas");
    const gasPriceBid = toBigInt(request.gasPriceBid, "gasPriceBid");
    const data = normalizeHexData(request.data);

    const refundAddress = request.excessFeeRefundAddress ?? (await this.signer.getAddress());
    const callValueRefundAddress = request.callValueRefundAddress ?? refundAddress;

    const msgValue = maxSubmissionCost + l2CallValue + gasPriceBid * maxGas;

    return inbox.createRetryableTicket(
      request.to,
      l2CallValue,
      maxSubmissionCost,
      refundAddress,
      callValueRefundAddress,
      maxGas,
      gasPriceBid,
      data,
      { value: msgValue }
    );
  }

  async depositToOptimismPortal(
    request: OptimismDepositRequest
  ): Promise<ContractTransactionResponse> {
    const portal = this.getOptimismPortal((request.portalAddress ?? this.optimismPortalAddress).toLowerCase());

    const value = toBigInt(request.value, "value");
    const gasLimit = toBigInt(request.gasLimit, "gasLimit");
    const data = normalizeHexData(request.data);
    const isCreation = request.isCreation ?? false;

    return portal.depositTransaction(request.to, value, gasLimit, isCreation, data, { value });
  }

  async sendTransaction(
    request: ForceInclusionTransactionRequest
  ): Promise<ContractTransactionResponse> {
    if (request.l2.type === "arb") {
      const { l2, ...rest } = request as ArbitrumTransactionRequest;
      const normalized: ArbitrumRetryableTicketRequest = {
        ...rest,
        inboxAddress: l2.l1ContractAddress,
      };
      return this.createArbitrumRetryableTicket(normalized);
    }

    if (request.l2.type === "op") {
      const { l2, ...rest } = request as OptimismTransactionRequest;
      const normalized: OptimismDepositRequest = {
        ...rest,
        portalAddress: l2.l1ContractAddress,
      };
      return this.depositToOptimismPortal(normalized);
    }

    throw new Error("Unsupported L2 type");
  }

  static fromPrivateKey(
    privateKey: string,
    rpcUrl: string,
    overrides: Omit<ForceInclusionClientConfig, "signer"> = {}
  ): ForceInclusionClient {
    const provider = new JsonRpcProvider(rpcUrl);
    const signer = new Wallet(privateKey, provider);
    return new ForceInclusionClient({ signer, ...overrides });
  }

  private getArbitrumInbox(address: string): ArbitrumInboxContract {
    const normalized = address.toLowerCase();
    const existing = this.arbitrumCache.get(normalized);
    if (existing) {
      return existing;
    }

    const contract = this.factories.createArbitrumInbox(normalized, this.signer);
    this.arbitrumCache.set(normalized, contract);
    return contract;
  }

  private getOptimismPortal(address: string): OptimismPortalContract {
    const normalized = address.toLowerCase();
    const existing = this.optimismCache.get(normalized);
    if (existing) {
      return existing;
    }

    const contract = this.factories.createOptimismPortal(normalized, this.signer);
    this.optimismCache.set(normalized, contract);
    return contract;
  }
}
