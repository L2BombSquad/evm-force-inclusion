# Optimism Sepolia Deposit Example (Vite + React + TS)

Demo app showing how to use `evm-force-inclusion` with wagmi/RainbowKit (wallet connection) to deposit ETH to Optimism Sepolia via the L1 Sepolia `OptimismPortal`.

> Connect a wallet with Sepolia ETH. No private keys are pasted into the app.

## Prerequisites

- Bun installed
- Build the SDK at repo root so the local link has `dist/`:

```bash
bun install
bun run build
```

## Running

```bash
cd examples/op-sepolia-vite
bun install
# Optional: WalletConnect project id for RainbowKit (recommended)
echo "VITE_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID" > .env
bun run dev
```

Open http://localhost:5173 and:
- Connect your wallet (Sepolia L1)
- Enter recipient on OP Sepolia
- Enter amount in ETH
- Optional L1 gas limit (default 200000)

On submit, the app sends an L1 Sepolia transaction to the `OptimismPortal` at `DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS`. It displays the L1 tx hash with a link to Sepolia Etherscan.

## Notes

- Requires Sepolia ETH to cover L1 gas plus the deposit amount.
- Settlement to OP Sepolia occurs after L2 derivation; display may be delayed.


