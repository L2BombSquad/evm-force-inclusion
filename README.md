# evm-force-inclusion

TypeScript SDK for constructing L1 transactions that force messages onto Arbitrum and Optimism stack-based rollups. The client wraps the canonical inbox contracts and handles value calculations, refund addresses, and request validation.

## Installation

```bash
npm install evm-force-inclusion viem
```

## Usage

Choose one of the following:

### Option 1 — wagmi (browser wallet connectors)

```tsx
import { useWalletClient } from "wagmi";
import {
  ForceInclusionClient,
  DEFAULT_OPTIMISM_PORTAL_ADDRESS,
} from "evm-force-inclusion";
import { parseEther } from "viem";

export function DepositButton() {
  const { data: walletClient } = useWalletClient();

  async function onClick() {
    if (!walletClient) return;
    const client = new ForceInclusionClient({ walletClient });
    await client.sendTransaction({
      l2: { type: "op", l1ContractAddress: DEFAULT_OPTIMISM_PORTAL_ADDRESS },
      to: "0xRecipient...",
      value: parseEther("0.01"),
      gasLimit: 200000n,
      data: "0x",
    });
  }

  return <button onClick={onClick}>Deposit to OP</button>;
}
```

For a more complete example (including Sepolia), see the wagmi doc in `docs/wagmi.md`.

### Option 2 — private key (server scripts, bots, CLIs)

```ts
import {
  ForceInclusionClient,
  DEFAULT_ARBITRUM_INBOX_ADDRESS,
  DEFAULT_OPTIMISM_PORTAL_ADDRESS,
} from "evm-force-inclusion";

const client = ForceInclusionClient.fromPrivateKey(
  process.env.WALLET_PRIVATE_KEY!,
  "https://mainnet.rpc"
);

// Arbitrum: create a retryable ticket
await client.sendTransaction({
  l2: { type: "arb", l1ContractAddress: DEFAULT_ARBITRUM_INBOX_ADDRESS },
  to: "0x...", // L2 recipient
  l2CallValue: 0n,
  maxSubmissionCost: 100000000000000n,
  maxGas: 200000n,
  gasPriceBid: 1000000000n,
  data: "0x",
});

// OP Stack: deposit transaction
await client.sendTransaction({
  l2: { type: "op", l1ContractAddress: DEFAULT_OPTIMISM_PORTAL_ADDRESS },
  to: "0x...",
  value: 1000000000000000n,
  gasLimit: 200000n,
});
```

## API

### `ForceInclusionClient`

- `constructor(config)` – create with an existing `WalletClient` from `viem` and optional contract overrides.
- `ForceInclusionClient.fromPrivateKey(privateKey, rpcUrl, overrides)` – convenience constructor using `viem` under the hood.
- `sendTransaction(request)` – unified entry point; pass `request.l2.type` as `"arb"` or `"op"` with an explicit `l1ContractAddress`.
- `createArbitrumRetryableTicket(request)` / `depositToOptimismPortal(request)` remain available for direct interaction, if preferred.

Requests validate numeric inputs, normalize data payloads, and use the caller address for refund parameters by default.

### Custom Contracts

Pass `contracts` to the constructor when you want to point at alternate Nitro or OP Stack deployments:

```ts
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const walletClient = createWalletClient({
  account: privateKeyToAccount(process.env.WALLET_PRIVATE_KEY! as `0x${string}`),
  transport: http("https://mainnet.rpc"),
});

const client = new ForceInclusionClient({
  walletClient,
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

// Ensure the wallet holds ETH on Sepolia to cover L1 gas.
```

### Arbitrum retryables vs OP deposits

- **Arbitrum (Nitro)**: `createRetryableTicket` will attempt an auto-redeem on L2. If auto-redeem fails (e.g. insufficient `maxGas/gasPriceBid` or the L2 call reverts, or if you are interacting with a testnet), you must redeem the ticket on L2 within its lifetime. This SDK only submits the L1 transaction; it does not redeem on L2 for you.
- **OP Stack (Optimism/Base, etc.)**: `depositTransaction` is executed by the derivation pipeline; there is no separate redeem step.

Minimal viem example to redeem an Arbitrum retryable on L2 (if needed):

```ts
import { createWalletClient, http } from "viem";
import { parseAbi } from "viem";

// Precompile address on Arbitrum chains
const ARB_RETRYABLE_TX = "0x000000000000000000000000000000000000006e" as const;
const ARB_RETRYABLE_ABI = parseAbi([
  "function redeem(bytes32 ticketId) returns (bool)"
]);

// ticketId must be obtained from the retryable workflow (e.g. event/indexer)
async function redeemRetryable(walletClient: any, ticketId: `0x${string}`) {
  return walletClient.writeContract({
    address: ARB_RETRYABLE_TX,
    abi: ARB_RETRYABLE_ABI,
    functionName: "redeem",
    account: walletClient.account,
    chain: walletClient.chain,
    args: [ticketId],
  });
}
```

Notes:
- The ticket lifetime and semantics are defined by Arbitrum; ensure you monitor the L2 execution status and redeem before expiry if auto-redeem fails.
- OP Stack chains do not require a redeem call; ensure you size `gasLimit` appropriately for your deposit call.

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

### Note on peer dependency

This package now uses `viem` instead of `ethers`. `viem` is declared as a peer dependency, so ensure it is installed in your application.
