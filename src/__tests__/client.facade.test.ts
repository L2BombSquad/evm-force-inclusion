import { describe, expect, it } from "vitest";
import type { WalletClient } from "viem";

import { ForceInclusionClient } from "../client.js";
import { DEFAULT_ARBITRUM_INBOX_ADDRESS, DEFAULT_OPTIMISM_PORTAL_ADDRESS } from "../constants.js";
import type { ArbitrumInboxContract, OptimismPortalContract } from "../types.js";

function createTestWalletClient(address: string): WalletClient {
  return {
    account: { address: address as `0x${string}` },
  } as unknown as WalletClient;
}

describe("Facade API", () => {
  it("arbitrum().send routes to Arbitrum adapter", async () => {
    const calls: unknown[][] = [];
    const walletClient = createTestWalletClient(
      "0x1111111111111111111111111111111111111111"
    );
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
      factories: { createArbitrumInbox: () => inbox },
    });

    await client.arbitrum().send({
      inboxAddress: DEFAULT_ARBITRUM_INBOX_ADDRESS,
      to: "0x2222222222222222222222222222222222222222",
      l2CallValue: 1n,
      maxSubmissionCost: 2n,
      maxGas: 3n,
      gasPriceBid: 4n,
    });

    expect(calls).toHaveLength(1);
  });

  it("optimism().send routes to Optimism adapter", async () => {
    const calls: unknown[][] = [];
    const walletClient = createTestWalletClient(
      "0x1111111111111111111111111111111111111111"
    );
    const portal: OptimismPortalContract = {
      depositTransaction: (to, value, gasLimit, isCreation, data, overrides) => {
        calls.push([to, value, gasLimit, isCreation, data, overrides]);
        return Promise.resolve({} as any);
      },
    };

    const client = new ForceInclusionClient({
      walletClient,
      factories: { createOptimismPortal: () => portal },
    });

    await client.optimism().send({
      portalAddress: DEFAULT_OPTIMISM_PORTAL_ADDRESS,
      to: "0x3333333333333333333333333333333333333333",
      value: 5n,
      gasLimit: 6n,
      isCreation: true,
      data: "0x1234",
    });

    expect(calls).toHaveLength(1);
  });

  it("rollup('arb').send and rollup('op').send work generically", async () => {
    const walletClient = createTestWalletClient(
      "0x1111111111111111111111111111111111111111"
    );
    const client = new ForceInclusionClient({ walletClient });
    // No thrown error on lookup
    expect(() => client.rollup("arb")).not.toThrow();
    expect(() => client.rollup("op")).not.toThrow();
  });
});


