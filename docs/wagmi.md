# Wagmi Integration

`fromPrivateKey` is a convenience. You can pass any viem `WalletClient`, including the one provided by wagmi/RainbowKit.

Minimal example:

```tsx
import { useWalletClient } from 'wagmi';
import {
  ForceInclusionClient,
  DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS,
} from 'evm-force-inclusion';
import { parseEther } from 'viem';

export function DepositButton() {
  const { data: walletClient } = useWalletClient();
  async function onClick() {
    if (!walletClient) return;
    const client = new ForceInclusionClient({ walletClient });
    await client.sendTransaction({
      l2: { type: 'op', l1ContractAddress: DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS },
      to: '0xRecipient...',
      value: parseEther('0.01'),
      gasLimit: 200000n,
      data: '0x',
    });
  }
  return <button onClick={onClick}>Deposit</button>;
}
```

Notes:
- Ensure the connected wallet is on the correct L1 (Mainnet vs Sepolia) for the chosen contract address.
- For Arbitrum, size retryable parameters as needed (`maxSubmissionCost`, `maxGas`, `gasPriceBid`).

