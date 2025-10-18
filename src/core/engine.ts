import type { Hash } from "viem";
import type { RollupAdapter, AdapterContext } from "./adapter.js";
import type { ForceExitRequest, ForceInclusionTransactionRequest, CoreOptions, Logger } from "../types.js";

const defaultLogger: Logger = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export class CoreEngine {
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly logger: Logger;

  constructor(options: CoreOptions = {}) {
    this.maxRetries = options.maxRetries ?? 0;
    this.retryDelayMs = options.retryDelayMs ?? 0;
    this.logger = options.logger ?? defaultLogger;
  }

  async execute(
    adapter: RollupAdapter,
    request: ForceInclusionTransactionRequest,
    context: AdapterContext
  ): Promise<Hash> {
    return this.withRetries(() => adapter.sendForceInclusion(request, { ...context, logger: this.logger }));
  }

  async executeForcedExit(
    adapter: RollupAdapter,
    request: ForceExitRequest,
    context: AdapterContext
  ): Promise<Hash> {
    if (!adapter.executeForcedExit) {
      throw new Error(`Forced exit not supported by adapter: ${adapter.name}`);
    }
    return this.withRetries(() => adapter.executeForcedExit!(request, { ...context, logger: this.logger }));
  }

  private async withRetries<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    // At least one attempt
    // If maxRetries is N, total attempts = N + 1
    while (true) {
      try {
        attempt++;
        this.logger.debug("engine.attempt", { attempt });
        return await fn();
      } catch (err) {
        if (attempt > this.maxRetries) throw err;
        if (this.retryDelayMs > 0) await new Promise((r) => setTimeout(r, this.retryDelayMs));
      }
    }
  }
}


