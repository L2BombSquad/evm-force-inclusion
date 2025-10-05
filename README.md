# evm-force-inclusion

TypeScript SDK for constructing L1 transactions that force messages onto Arbitrum and Optimism stack-based rollups. The client wraps the canonical inbox contracts and handles value calculations, refund addresses, and request validation.

## Installation

```bash
npm install evm-force-inclusion
```

## Usage

```ts
import {
  ForceInclusionClient,
  DEFAULT_ARBITRUM_INBOX_ADDRESS,
  DEFAULT_ARBITRUM_SEPOLIA_INBOX_ADDRESS,
  DEFAULT_OPTIMISM_PORTAL_ADDRESS,
  DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS,
} from "evm-force-inclusion";

const client = ForceInclusionClient.fromPrivateKey(
  process.env.WALLET_PRIVATE_KEY!,
  "https://mainnet.rpc"
);

await client.sendTransaction({
  l2: { type: "arb", l1ContractAddress: DEFAULT_ARBITRUM_INBOX_ADDRESS },
  to: "0x...", // L2 recipient
  l2CallValue: 0n,
  maxSubmissionCost: 100000000000000n,
  maxGas: 200000n,
  gasPriceBid: 1000000000n,
  data: "0x",
});

await client.sendTransaction({
  l2: { type: "op", l1ContractAddress: DEFAULT_OPTIMISM_PORTAL_ADDRESS },
  to: "0x...",
  value: 1000000000000000n,
  gasLimit: 200000n,
});
```

## API

### `ForceInclusionClient`

- `constructor(config)` – create with an existing `Signer` and optional contract overrides.
- `ForceInclusionClient.fromPrivateKey(privateKey, rpcUrl, overrides)` – convenience constructor.
- `sendTransaction(request)` – unified entry point; pass `request.l2.type` as `"arb"` or `"op"` with an explicit `l1ContractAddress`.
- `createArbitrumRetryableTicket(request)` / `depositToOptimismPortal(request)` remain available for direct interaction, if preferred.

Requests validate numeric inputs, normalize data payloads, and use the caller address for refund parameters by default.

### Custom Contracts

Pass `contracts` to the constructor when you want to point at alternate Nitro or OP Stack deployments:

```ts
const client = new ForceInclusionClient({
  signer,
  contracts: {
    arbitrumInbox: { address: "0x..." },
    optimismPortal: { address: "0x..." },
  },
});
```

Override a single transaction by setting `l2.l1ContractAddress` (defaults are exported for convenience, including Sepolia testnet):

```ts
await client.sendTransaction({
  l2: { type: "arb", l1ContractAddress: "0x..." },
  to: "0x...",
  l2CallValue: 1n,
  maxSubmissionCost: 2n,
  maxGas: 3n,
  gasPriceBid: 4n,
});
```

To target Sepolia testnets, import `DEFAULT_ARBITRUM_SEPOLIA_INBOX_ADDRESS` or `DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS` and pass them via `l1ContractAddress`.

### Working with Testnets

Transactions are always submitted on the L1 that secures the target rollup. To interact with Arbitrum or Optimism Sepolia, point the client at an Ethereum Sepolia RPC URL and use the exported Sepolia contract addresses:

```ts
const client = ForceInclusionClient.fromPrivateKey(
  process.env.WALLET_PRIVATE_KEY!,
  `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`
);

await client.sendTransaction({
  l2: { type: "arb", l1ContractAddress: DEFAULT_ARBITRUM_SEPOLIA_INBOX_ADDRESS },
  to: "0x...",
  l2CallValue: 0n,
  maxSubmissionCost: 100000000000000n,
  maxGas: 200000n,
  gasPriceBid: 1000000000n,
});

await client.sendTransaction({
  l2: { type: "op", l1ContractAddress: DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS },
  to: "0x...",
  value: 1000000000000000n,
  gasLimit: 200000n,
});

// Ensure the signer holds ETH on Sepolia to cover L1 gas.
```

### Default Addresses

- `DEFAULT_ARBITRUM_INBOX_ADDRESS`
- `DEFAULT_ARBITRUM_SEPOLIA_INBOX_ADDRESS`
- `DEFAULT_OPTIMISM_PORTAL_ADDRESS`
- `DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS`

## Building & Testing

```bash
npm install
npm run build
npm run test
```

Publishing is wired through `prepublishOnly` which runs the build and test suite automatically.
