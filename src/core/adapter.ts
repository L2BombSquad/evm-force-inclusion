import type { WalletClient, Hash } from "viem";
import type { ForceInclusionContractFactories, ForceExitRequest, Logger } from "../types.js";

export interface AdapterContext {
  walletClient: WalletClient;
  factories: ForceInclusionContractFactories;
  /** Resolved defaults from the client instance */
  defaultArbitrumInboxAddress: string;
  defaultOptimismPortalAddress: string;
  /** Lazily resolves the active account address; throws if unavailable */
  getAccountAddress(): Promise<string>;
  /** Logger provided by the core */
  logger: Logger;
}

export interface RollupAdapter {
  /** Human-readable name, e.g. "arbitrum" */
  name: string;
  /** Supported rollup keys/aliases, e.g. ["arb", "arbitrum"] */
  supports: string[];
  /**
   * Submit a force-inclusion style transaction for this rollup.
   * The adapter should validate and normalize inputs appropriate to the target.
   */
  sendForceInclusion(request: unknown, context: AdapterContext): Promise<Hash>;

  /**
   * Execute end-to-end forced exit flow if supported by the rollup.
   * Implementations may: enqueue L1 message, construct proof, and finalize.
   */
  executeForcedExit?(
    request: ForceExitRequest,
    context: AdapterContext
  ): Promise<Hash>;
}


