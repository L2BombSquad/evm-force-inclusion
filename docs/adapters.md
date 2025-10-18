# Adapters Guide

Adapters encapsulate all rollup-specific logic and expose a small, consistent interface to the core engine.

## Interface

```ts
interface RollupAdapter {
  name: string;           // e.g. "arbitrum"
  supports: string[];     // e.g. ["arb", "arbitrum"]
  sendForceInclusion(request, context): Promise<Hash>;
  executeForcedExit?(request, context): Promise<Hash>;
}
```

`context` provides:
- `walletClient` – signer + network
- `factories` – contract factories (Inbox/Portal, etc.)
- default addresses and `getAccountAddress()`
- `logger` – from core options

## Example: Registering a custom adapter

```ts
import type { RollupAdapter } from 'evm-force-inclusion';
import { createAdapter } from 'evm-force-inclusion';

const MyAdapter: RollupAdapter = createAdapter({
  name: 'myrollup',
  supports: ['my', 'myrollup'],
  async sendForceInclusion(request, { walletClient, factories }) {
    // Construct + send the L1 tx via factories and walletClient
    throw new Error('not implemented');
  },
  async executeForcedExit(request, context) {
    // Optional: full exit flow (enqueue, prove, finalize)
    throw new Error('not implemented');
  }
});

client.registerAdapter(MyAdapter);
```

## Built-ins

- `ArbitrumAdapter` – uses Inbox `createRetryableTicket`
- `OptimismAdapter` – uses OptimismPortal `depositTransaction`

## Routing

The registry maps aliases to adapters. Use the client methods or generic router:

```ts
await client.arbitrum().send(/* request */);
await client.rollup('my').send(/* request */ as any);
// After registration, a method is also available:
await client.myrollup().send(/* request */ as any);
```
