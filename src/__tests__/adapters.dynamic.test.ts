import { describe, expect, it } from 'vitest';
import type { WalletClient } from 'viem';
import type { RollupAdapter } from '../core/adapter.js';
import { createAdapter } from '../core/adapter.js';
import { ForceInclusionClient } from '../client.js';
import type { Hash } from 'viem';

function createTestWalletClient(address: string): WalletClient {
  return { account: { address: address as `0x${string}` } } as unknown as WalletClient;
}

describe('Dynamic client methods for adapters', () => {
  it('exposes client.myRollup().send when registering adapter named "myrollup"', async () => {
    const walletClient = createTestWalletClient('0x1111111111111111111111111111111111111111');
    const client = new ForceInclusionClient({ walletClient });

    let called = false;
    const myAdapter: RollupAdapter = createAdapter({
      name: 'myrollup',
      supports: ['my'],
      async sendForceInclusion(_request: unknown): Promise<Hash> {
        called = true;
        return '0xhash' as Hash;
      },
    });

    client.registerAdapter(myAdapter);

    // @ts-expect-error - dynamic method injection
    const result = await client.myrollup().send({ some: 'request' } as any);
    expect(result).toBeTypeOf('string');
    expect(called).toBe(true);
  });
});


