import { describe, expect, it } from "vitest";
import type { WalletClient } from "viem";

import { ForceInclusionClient } from "../client.js";
import { DEFAULT_ARBITRUM_INBOX_ADDRESS } from "../constants.js";
import type { ArbitrumInboxContract } from "../types.js";
import type { RollupAdapter } from "../core/adapter.js";
import { ArbitrumAdapter } from "../adapters/arbitrum.js";

function createTestWalletClient(address: string): WalletClient {
  // Minimal stub: only account.address is used by the client during tests.
  return {
    account: { address: address as `0x${string}` },
  } as unknown as WalletClient;
}

describe("Adapter registration & routing", () => {
  it("registerAdapter overrides the default 'arb' adapter and is invoked", async () => {
    const walletClient = createTestWalletClient(
      "0x1111111111111111111111111111111111111111"
    );

    const calls: unknown[][] = [];
    const inbox: ArbitrumInboxContract = {
      createRetryableTicket: (
        to,
        l2CallValue,
        maxSubmissionCost,
        excessFeeRefundAddress,
        callValueRefundAddress,
        maxGas,
        gasPriceBid,
        data,
        overrides
      ) => {
        calls.push([
          to,
          l2CallValue,
          maxSubmissionCost,
          excessFeeRefundAddress,
          callValueRefundAddress,
          maxGas,
          gasPriceBid,
          data,
          overrides,
        ]);
        return Promise.resolve({} as any);
      },
    };

    const client = new ForceInclusionClient({
      walletClient,
      factories: {
        createArbitrumInbox: () => inbox,
      },
    });

    let adapterCalled = false;
    const spyAdapter: RollupAdapter = {
      ...ArbitrumAdapter,
      name: "arb-spy",
      supports: ["arb"],
      async sendForceInclusion(request, context) {
        adapterCalled = true;
        return ArbitrumAdapter.sendForceInclusion(request, context);
      },
    };

    client.registerAdapter(spyAdapter);

    await client.sendTransaction({
      l2: { type: "arb", l1ContractAddress: DEFAULT_ARBITRUM_INBOX_ADDRESS },
      to: "0x2222222222222222222222222222222222222222",
      l2CallValue: 1n,
      maxSubmissionCost: 2n,
      maxGas: 3n,
      gasPriceBid: 4n,
    });

    expect(adapterCalled).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("can handle a custom adapter type registered at runtime (typed as any)", async () => {
    const walletClient = createTestWalletClient(
      "0x1111111111111111111111111111111111111111"
    );

    const client = new ForceInclusionClient({ walletClient });

    let invoked = false;
    const custom: RollupAdapter = {
      name: "mockrollup",
      supports: ["mock"],
      async sendForceInclusion(_request, _context) {
        invoked = true;
        return {} as any;
      },
    };

    client.registerAdapter(custom);

    // Cast to any since the public request type currently enumerates known rollups.
    await client.sendTransaction({
      l2: { type: "mock", l1ContractAddress: "0x0000000000000000000000000000000000000000" },
      to: "0x1111111111111111111111111111111111111111",
    } as any);

    expect(invoked).toBe(true);
  });
});



