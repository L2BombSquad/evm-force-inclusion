import { describe, expect, it } from "vitest";
import type { Signer } from "ethers";

import { ForceInclusionClient } from "../client.js";
import {
  DEFAULT_ARBITRUM_INBOX_ADDRESS,
  DEFAULT_ARBITRUM_SEPOLIA_INBOX_ADDRESS,
  DEFAULT_OPTIMISM_PORTAL_ADDRESS,
  DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS,
} from "../constants.js";
import type {
  ArbitrumInboxContract,
  OptimismPortalContract,
} from "../types.js";

function createTestSigner(address: string): Signer {
  return {
    getAddress: async () => address,
  } as unknown as Signer;
}

describe("ForceInclusionClient", () => {
  it("creates retryable ticket with computed msg value and defaults", async () => {
    const calls: unknown[][] = [];

    const signer = createTestSigner("0x1111111111111111111111111111111111111111");
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
      signer,
      factories: {
        createArbitrumInbox: () => inbox,
      },
    });

    await client.sendTransaction({
      l2: { type: "arb", l1ContractAddress: DEFAULT_ARBITRUM_INBOX_ADDRESS },
      to: "0x2222222222222222222222222222222222222222",
      l2CallValue: 1n,
      maxSubmissionCost: 2n,
      maxGas: 3n,
      gasPriceBid: 4n,
    });

    expect(calls).toHaveLength(1);
    const [args] = calls;

    expect(args[0]).toBe("0x2222222222222222222222222222222222222222");
    expect(args[1]).toBe(1n);
    expect(args[2]).toBe(2n);
    expect(args[3]).toBe("0x1111111111111111111111111111111111111111");
    expect(args[4]).toBe("0x1111111111111111111111111111111111111111");
    expect(args[5]).toBe(3n);
    expect(args[6]).toBe(4n);
    expect(args[7]).toBe("0x");
    expect(args[8]).toEqual({ value: 2n + 1n + 4n * 3n });
  });

  it("deposits to optimism portal with provided values", async () => {
    const calls: unknown[][] = [];

    const signer = createTestSigner("0x1111111111111111111111111111111111111111");
    const portal: OptimismPortalContract = {
      depositTransaction: (to, value, gasLimit, isCreation, data, overrides) => {
        calls.push([to, value, gasLimit, isCreation, data, overrides]);
        return Promise.resolve({} as any);
      },
    };

    const client = new ForceInclusionClient({
      signer,
      factories: {
        createOptimismPortal: () => portal,
      },
    });

    await client.sendTransaction({
      l2: { type: "op", l1ContractAddress: DEFAULT_OPTIMISM_PORTAL_ADDRESS },
      to: "0x3333333333333333333333333333333333333333",
      value: 5n,
      gasLimit: 6n,
      isCreation: true,
      data: "0x1234",
    });

    expect(calls).toHaveLength(1);
    const [args] = calls;

    expect(args[0]).toBe("0x3333333333333333333333333333333333333333");
    expect(args[1]).toBe(5n);
    expect(args[2]).toBe(6n);
    expect(args[3]).toBe(true);
    expect(args[4]).toBe("0x1234");
    expect(args[5]).toEqual({ value: 5n });
  });

  it("normalizes data and validates inputs", async () => {
    const signer = createTestSigner("0x1111111111111111111111111111111111111111");
    const inbox: ArbitrumInboxContract = {
      createRetryableTicket: async () => ({} as any),
    };

    const client = new ForceInclusionClient({
      signer,
      factories: {
        createArbitrumInbox: () => inbox,
      },
    });

    await expect(
      client.sendTransaction({
        l2: { type: "arb", l1ContractAddress: DEFAULT_ARBITRUM_INBOX_ADDRESS },
        to: "0x2222222222222222222222222222222222222222",
        l2CallValue: -1,
        maxSubmissionCost: 1,
        maxGas: 1,
        gasPriceBid: 1,
      })
    ).rejects.toThrow(/Invalid l2CallValue/);

    await expect(
      client.sendTransaction({
        l2: { type: "arb", l1ContractAddress: DEFAULT_ARBITRUM_INBOX_ADDRESS },
        to: "0x2222222222222222222222222222222222222222",
        l2CallValue: 1,
        maxSubmissionCost: 1,
        maxGas: 1,
        gasPriceBid: 1,
        data: "0x1",
      })
    ).rejects.toThrow(/even length/);
  });

  it("allows overriding default contracts through config", async () => {
    const signer = createTestSigner("0x4444444444444444444444444444444444444444");
    const inboxCalls: unknown[][] = [];
    const factoryInvocations: Array<[string, Signer]> = [];
    const customInbox = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

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
        inboxCalls.push([
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
      signer,
      contracts: {
        arbitrumInbox: {
          address: customInbox,
          factory: (address, providedSigner) => {
            factoryInvocations.push([address, providedSigner]);
            return inbox;
          },
        },
      },
    });

    await client.sendTransaction({
      l2: {
        type: "arb",
        l1ContractAddress: customInbox,
      },
      to: "0x2222222222222222222222222222222222222222",
      l2CallValue: 1n,
      maxSubmissionCost: 2n,
      maxGas: 3n,
      gasPriceBid: 4n,
    });

    expect(factoryInvocations).toEqual([[customInbox.toLowerCase(), signer]]);
    expect(inboxCalls).toHaveLength(1);
  });

  it("supports sepolia contract addresses", async () => {
    const signer = createTestSigner("0x5555555555555555555555555555555555555555");

    const arbitrumFactoryCalls: string[] = [];
    const optimismFactoryCalls: string[] = [];

    const inbox: ArbitrumInboxContract = {
      createRetryableTicket: async () => ({} as any),
    };

    const portal: OptimismPortalContract = {
      depositTransaction: async () => ({} as any),
    };

    const client = new ForceInclusionClient({
      signer,
      factories: {
        createArbitrumInbox: (address) => {
          arbitrumFactoryCalls.push(address);
          return inbox;
        },
        createOptimismPortal: (address) => {
          optimismFactoryCalls.push(address);
          return portal;
        },
      },
    });

    await client.sendTransaction({
      l2: { type: "arb", l1ContractAddress: DEFAULT_ARBITRUM_SEPOLIA_INBOX_ADDRESS },
      to: "0x1111111111111111111111111111111111111111",
      l2CallValue: 1n,
      maxSubmissionCost: 2n,
      maxGas: 3n,
      gasPriceBid: 4n,
    });

    await client.sendTransaction({
      l2: { type: "op", l1ContractAddress: DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS },
      to: "0x2222222222222222222222222222222222222222",
      value: 5n,
      gasLimit: 6n,
    });

    expect(arbitrumFactoryCalls).toContain(
      DEFAULT_ARBITRUM_SEPOLIA_INBOX_ADDRESS.toLowerCase()
    );
    expect(optimismFactoryCalls).toContain(
      DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS.toLowerCase()
    );
  });
});
