import { describe, expect, it } from "vitest";
import type { WalletClient } from "viem";

import { ForceInclusionClient } from "../client.js";
import type { RollupAdapter } from "../core/adapter.js";
import type { Hash } from "viem";

function createTestWalletClient(address: string): WalletClient {
  return {
    account: { address: address as `0x${string}` },
  } as unknown as WalletClient;
}

describe("forceExit", () => {
  it("routes to adapter.executeForcedExit with retries", async () => {
    const walletClient = createTestWalletClient(
      "0x1111111111111111111111111111111111111111"
    );

    let calls = 0;
    const mockAdapter: RollupAdapter = {
      name: "mockrollup",
      supports: ["mock"],
      async sendForceInclusion() {
        throw new Error("not used");
      },
      async executeForcedExit() {
        calls++;
        if (calls < 2) throw new Error("transient");
        return "0xhash" as Hash;
      },
    };

    const client = new ForceInclusionClient({
      walletClient,
      core: { maxRetries: 2, retryDelayMs: 0 },
    });
    client.registerAdapter(mockAdapter);

    const tx = await client.forceExit({
      rollup: "mock",
      token: { type: "native", symbol: "ETH" },
      amount: "0.01",
      userAddress: "0x1111111111111111111111111111111111111111",
    });

    expect(tx).toBeTypeOf("string");
    expect(calls).toBe(2);
  });
});


