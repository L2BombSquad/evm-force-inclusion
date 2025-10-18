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
  ForceExitRequest,
} from "./types.js";
import { normalizeHexData, toBigInt } from "./utils.js";
import { CoreEngine } from "./core/engine.js";
import { AdapterRegistry, createRegistryWithAdapters } from "./core/registry.js";
import type { RollupAdapter } from "./core/adapter.js";
import { ArbitrumAdapter } from "./adapters/arbitrum.js";
import { OptimismAdapter } from "./adapters/optimism.js";

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
  private readonly engine: CoreEngine;
  private readonly coreOptions: import("./types.js").CoreOptions;
  private readonly registry: AdapterRegistry;

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

    this.coreOptions = config.core ?? {};
    this.engine = new CoreEngine(this.coreOptions);
    this.registry = createRegistryWithAdapters([ArbitrumAdapter, OptimismAdapter]);
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
    // Temporary deprecation notice
    if (process?.env?.NODE_ENV !== "test") {
      try {
        // Only warn once per process
        // @ts-expect-error - attach symbol on globalThis
        if (!globalThis.__efi_warned_sendTransaction) {
          // @ts-expect-error - attach symbol on globalThis
          globalThis.__efi_warned_sendTransaction = true;
          // eslint-disable-next-line no-console
          console.warn(
            "evm-force-inclusion: sendTransaction(request) is deprecated. Use client.rollup(type).send(...) or client.optimism()/client.arbitrum() instead."
          );
        }
      } catch {}
    }
    const adapter = this.registry.getAdapterByType(request.l2.type);
    if (!adapter) {
      throw new Error("Unsupported L2 type");
    }

    const context = {
      walletClient: this.walletClient,
      factories: this.factories,
      defaultArbitrumInboxAddress: this.arbitrumInboxAddress,
      defaultOptimismPortalAddress: this.optimismPortalAddress,
      getAccountAddress: this.getAccountAddress.bind(this),
      logger: this.coreOptions.logger ?? console,
    };

    // Backwards compatibility: pass through legacy shape to adapter
    // but adapters now accept rollup-specific request bodies without l2.type
    let routed: any = request;
    if ((request as any).l2?.type === "arb") {
      const { l2, ...rest } = request as any;
      routed = { ...rest, inboxAddress: l2.l1ContractAddress };
    } else if ((request as any).l2?.type === "op") {
      const { l2, ...rest } = request as any;
      routed = { ...rest, portalAddress: l2.l1ContractAddress };
    }
    return this.engine.execute(adapter, routed, context);
  }

  /** Register an additional rollup adapter at runtime */
  registerAdapter(adapter: RollupAdapter): void {
    this.registry.register(adapter);
    // Attach a dynamic method if not already present
    const methodName = this.registry.getPreferredMethodName(adapter);
    if (!(methodName in this)) {
      // @ts-expect-error - dynamic method injection for DX
      this[methodName] = () => this.rollup(adapter.name);
    }
  }

  /** Target a rollup by alias and reuse the configured wallet/factories */
  rollup(type: string) {
    const adapter = this.registry.getAdapterByType(type);
    if (!adapter) {
      throw new Error(`Unsupported rollup: ${type}`);
    }
    const context = {
      walletClient: this.walletClient,
      factories: this.factories,
      defaultArbitrumInboxAddress: this.arbitrumInboxAddress,
      defaultOptimismPortalAddress: this.optimismPortalAddress,
      getAccountAddress: this.getAccountAddress.bind(this),
      logger: this.coreOptions.logger ?? console,
    };
    return {
      // Accept adapter-specific body (no l2.type required)
      send: (request: any) => this.engine.execute(adapter, request, context),
    } as const;
  }

  /** Convenience methods for built-ins */
  arbitrum() {
    return this.rollup("arb");
  }

  optimism() {
    return this.rollup("op");
  }

  /** High-level forced-exit flow routed through the adapter system */
  async forceExit(request: ForceExitRequest) {
    const adapter = this.registry.getAdapterByType(request.rollup);
    if (!adapter) throw new Error(`Unsupported rollup: ${request.rollup}`);
    const context = {
      walletClient: this.walletClient,
      factories: this.factories,
      defaultArbitrumInboxAddress: this.arbitrumInboxAddress,
      defaultOptimismPortalAddress: this.optimismPortalAddress,
      getAccountAddress: this.getAccountAddress.bind(this),
      logger: this.coreOptions.logger ?? console,
    };
    return this.engine.executeForcedExit(adapter, request, context);
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
