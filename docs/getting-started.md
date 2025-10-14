# Getting Started

## Install

```bash
bun add evm-force-inclusion viem
```

## OP Stack deposit (Optimism/Base, etc.)

```ts
import {
  ForceInclusionClient,
  DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS,
} from 'evm-force-inclusion';
import { parseEther } from 'viem';

const client = ForceInclusionClient.fromPrivateKey(
  process.env.WALLET_PRIVATE_KEY!,
  'https://sepolia.drpc.org'
);

await client.sendTransaction({
  l2: { type: 'op', l1ContractAddress: DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS },
  to: '0xRecipient...',
  value: parseEther('0.01'),
  gasLimit: 200000n,
  data: '0x',
});
```

## Arbitrum retryable

```ts
import {
  ForceInclusionClient,
  DEFAULT_ARBITRUM_SEPOLIA_INBOX_ADDRESS,
} from 'evm-force-inclusion';

const client = ForceInclusionClient.fromPrivateKey(
  process.env.WALLET_PRIVATE_KEY!,
  'https://sepolia.drpc.org'
);

await client.sendTransaction({
  l2: { type: 'arb', l1ContractAddress: DEFAULT_ARBITRUM_SEPOLIA_INBOX_ADDRESS },
  to: '0xRecipient...', // L2 recipient
  l2CallValue: 0n,
  maxSubmissionCost: 100000000000000n,
  maxGas: 200000n,
  gasPriceBid: 1000000000n,
  data: '0x',
});
```

## RPC and chain

- The SDK uses whichever RPC you provide to determine the L1 chain.
- Use the matching L1 contract address for that chain (mainnet vs sepolia).
- Optional guard example:

```ts
import { createPublicClient, http } from 'viem';
const id = await createPublicClient({ transport: http(rpcUrl) }).getChainId();
if (id !== 11155111) throw new Error('Use a Sepolia RPC URL');
```

