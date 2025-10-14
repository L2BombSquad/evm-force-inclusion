# EVM Force Inclusion

TypeScript SDK for constructing L1 transactions that force messages onto Arbitrum and Optimism stack-based rollups.

- Send Arbitrum retryables via the canonical Inbox
- Send OP Stack deposits via the OptimismPortal
- Strongly-typed API built on viem

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

await client.sendTransaction({
  l2: { type: 'op', l1ContractAddress: DEFAULT_OPTIMISM_PORTAL_ADDRESS },
  to: '0xRecipient...',
  value: 1000000000000000n,
  gasLimit: 200000n,
});
```

- For Sepolia, use a Sepolia RPC and `DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS`.
- See Getting Started for Arbitrum retryables and more options.

