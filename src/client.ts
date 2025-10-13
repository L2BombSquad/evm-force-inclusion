import type { WalletClient } from "viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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
  createArbitrumInbox: (address: string, walletClient: WalletClient) => {
    const normalized = address.toLowerCase() as `0x${string}`;
    return {
      async createRetryableTicket(
        to,
        l2CallValue,
        maxSubmissionCost,
        excessFeeRefundAddress,
        callValueRefundAddress,
        maxGas,
        gasPriceBid,
        data,
        overrides
      ) {
        if (!walletClient.account) {
          throw new Error("WalletClient must be configured with an account");
        }
        return walletClient.writeContract({
          address: normalized,
          abi: ARBITRUM_INBOX_ABI,
          functionName: "createRetryableTicket",
          account: walletClient.account,
          chain: walletClient.chain,
          args: [
            to as `0x${string}`,
            l2CallValue as bigint,
            maxSubmissionCost as bigint,
            excessFeeRefundAddress as `0x${string}`,
            callValueRefundAddress as `0x${string}`,
            maxGas as bigint,
            gasPriceBid as bigint,
            data,
          ],
          value: overrides?.value as bigint | undefined,
        });
      },
    } as ArbitrumInboxContract;
  },
  createOptimismPortal: (address: string, walletClient: WalletClient) => {
    const normalized = address.toLowerCase() as `0x${string}`;
    return {
      async depositTransaction(to, value, gasLimit, isCreation, data, overrides) {
        if (!walletClient.account) {
          throw new Error("WalletClient must be configured with an account");
        }
        return walletClient.writeContract({
          address: normalized,
          abi: OPTIMISM_PORTAL_ABI,
          functionName: "depositTransaction",
          account: walletClient.account,
          chain: walletClient.chain,
          args: [to as `0x${string}`, value as bigint, gasLimit as bigint, isCreation, data],
          value: overrides?.value as bigint | undefined,
        });
      },
    } as OptimismPortalContract;
  },
};

export class ForceInclusionClient {
  private readonly walletClient: WalletClient;
  private readonly arbitrumInboxAddress: string;
  private readonly optimismPortalAddress: string;
  private readonly factories: ForceInclusionContractFactories;
  private readonly arbitrumCache = new Map<string, ArbitrumInboxContract>();
  private readonly optimismCache = new Map<string, OptimismPortalContract>();

  constructor(config: ForceInclusionClientConfig) {
    this.walletClient = config.walletClient;
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
  ) {
    const inbox = this.getArbitrumInbox((request.inboxAddress ?? this.arbitrumInboxAddress).toLowerCase());

    const l2CallValue = toBigInt(request.l2CallValue, "l2CallValue");
    const maxSubmissionCost = toBigInt(request.maxSubmissionCost, "maxSubmissionCost");
    const maxGas = toBigInt(request.maxGas, "maxGas");
    const gasPriceBid = toBigInt(request.gasPriceBid, "gasPriceBid");
    const data = normalizeHexData(request.data);

    const refundAddress = request.excessFeeRefundAddress ?? (await this.getAccountAddress());
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
  ) {
    const portal = this.getOptimismPortal((request.portalAddress ?? this.optimismPortalAddress).toLowerCase());

    const value = toBigInt(request.value, "value");
    const gasLimit = toBigInt(request.gasLimit, "gasLimit");
    const data = normalizeHexData(request.data);
    const isCreation = request.isCreation ?? false;

    return portal.depositTransaction(request.to, value, gasLimit, isCreation, data, { value });
  }

  async sendTransaction(
    request: ForceInclusionTransactionRequest
  ) {
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
    overrides: Omit<ForceInclusionClientConfig, "walletClient"> = {}
  ): ForceInclusionClient {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({ account, transport: http(rpcUrl) });
    return new ForceInclusionClient({ walletClient, ...overrides });
  }

  private async getAccountAddress(): Promise<string> {
    const addr = this.walletClient.account?.address;
    if (!addr) {
      throw new Error("WalletClient has no account. Provide an account when creating the client.");
    }
    return addr;
  }

  private getArbitrumInbox(address: string): ArbitrumInboxContract {
    const normalized = address.toLowerCase();
    const existing = this.arbitrumCache.get(normalized);
    if (existing) {
      return existing;
    }

    const contract = this.factories.createArbitrumInbox(normalized, this.walletClient);
    this.arbitrumCache.set(normalized, contract);
    return contract;
  }

  private getOptimismPortal(address: string): OptimismPortalContract {
    const normalized = address.toLowerCase();
    const existing = this.optimismCache.get(normalized);
    if (existing) {
      return existing;
    }

    const contract = this.factories.createOptimismPortal(normalized, this.walletClient);
    this.optimismCache.set(normalized, contract);
    return contract;
  }
}
