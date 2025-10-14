# Optimism Sepolia Deposit Example (Vite + React + TS)

Demo app showing how to use `evm-force-inclusion` in-browser with a private key to deposit ETH to Optimism Sepolia via the L1 Sepolia `OptimismPortal`.

> Demo only. Never paste a production or valuable private key here. Use a fresh test wallet funded with Sepolia ETH.

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
# Optional: configure RPC, defaults to https://sepolia.drpc.org
# echo "VITE_RPC_URL=https://sepolia.drpc.org" > .env
bun run dev
```

Open http://localhost:5173 and fill out:
- Private key (0x…)
- Recipient on OP Sepolia
- Amount in ETH
- Optional L1 gas limit (default 200000)

On submit, the app sends an L1 Sepolia transaction to the `OptimismPortal` at `DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS`. It displays the L1 tx hash with a link to Sepolia Etherscan.

## Notes

- Requires Sepolia ETH to cover L1 gas plus the deposit amount.
- Settlement to OP Sepolia occurs after L2 derivation; display may be delayed.


