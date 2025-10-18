# EVM Force Inclusion

TypeScript SDK for constructing L1 transactions that force messages onto Arbitrum and Optimism stack-based rollups.

- Send Arbitrum retryables via the canonical Inbox
- Send OP Stack deposits via the OptimismPortal
- Strongly-typed API built on viem

## Design Overview

- Core engine with retries/logging routes to rollup adapters.
- Adapters encapsulate chain-specific logic; register more via `client.registerAdapter(...)`.
- Facade API: `client.rollup(type).send(...)`, `client.optimism().send(...)`, `client.arbitrum().send(...)`. A high-level `client.forceExit(...)` is also available where supported.

See [Architecture](./architecture.md) and the [Adapters Guide](./adapters.md).

## Quick start

```bash
bun add evm-force-inclusion viem
```

```ts
import {
  ForceInclusionClient,
  DEFAULT_OPTIMISM_PORTAL_ADDRESS,
} from 'evm-force-inclusion';

const client = ForceInclusionClient.fromPrivateKey(
  process.env.WALLET_PRIVATE_KEY!,
  'https://mainnet.rpc'
);

await client.optimism().send({
  portalAddress: DEFAULT_OPTIMISM_PORTAL_ADDRESS,
  to: '0xRecipient...',
  value: 1000000000000000n,
  gasLimit: 200000n,
});
```

- For Sepolia, use a Sepolia RPC and `DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS`.
- See Getting Started for Arbitrum retryables and more options.


