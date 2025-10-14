import { useMemo, useState } from "react";
import { parseEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import {
  ForceInclusionClient,
  DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS,
} from "evm-force-inclusion";

function App() {
  const { data: walletClient } = useWalletClient();
  const [toAddress, setToAddress] = useState("");
  const [amountEth, setAmountEth] = useState("0.01");
  const [gasLimit, setGasLimit] = useState("200000");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const l1Name = useMemo(() => "Sepolia (L1)", []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setTxHash(null);
    try {
      if (!walletClient) throw new Error("Connect your wallet to continue");
      if (!toAddress || !toAddress.startsWith("0x")) {
        throw new Error("Recipient must be a 0x-prefixed address");
      }
      const gasLimitBigInt = BigInt(gasLimit || "200000");
      const id = walletClient.chain?.id;
      if (id !== sepolia.id) {
        throw new Error(`Please switch your wallet to Sepolia (chainId ${sepolia.id}).`);
      }
      const client = new ForceInclusionClient({ walletClient });
      const hash = await client.sendTransaction({
        l2: {
          type: "op",
          l1ContractAddress: DEFAULT_OPTIMISM_SEPOLIA_PORTAL_ADDRESS,
        },
        to: toAddress as `0x${string}`,
        value: parseEther(amountEth),
        gasLimit: gasLimitBigInt,
        data: "0x",
      });
      setTxHash(hash as string);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 16,
        fontFamily: "Inter, system-ui, Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ marginTop: 0 }}>
          Optimism Sepolia Deposit (L1 → OP Sepolia)
        </h1>
        <ConnectButton />
      </div>
      <div
        style={{
          padding: 12,
          background: "#fff7e6",
          border: "1px solid #ffe58f",
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        <strong>Note:</strong> Connect a wallet on {l1Name}. Deposits are sent from your
        connected account to the Optimism Portal on L1.
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Recipient address (OP Sepolia)</span>
          <input
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value.trim())}
            placeholder="0xRecipient..."
            autoComplete="off"
            spellCheck={false}
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #d9d9d9",
            }}
          />
        </label>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            <span>Amount (ETH)</span>
            <input
              value={amountEth}
              onChange={(e) => setAmountEth(e.target.value)}
              placeholder="0.01"
              inputMode="decimal"
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #d9d9d9",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>L1 gas limit</span>
            <input
              value={gasLimit}
              onChange={(e) =>
                setGasLimit(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="200000"
              inputMode="numeric"
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #d9d9d9",
              }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: submitting ? "#d9d9d9" : "#1677ff",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "10px 14px",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting…" : "Deposit to OP Sepolia"}
        </button>
      </form>

      {txHash && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
          }}
        >
          <div>
            <strong>L1 Sepolia tx submitted.</strong>
          </div>
          <div>
            Hash:{" "}
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {txHash}
            </a>
          </div>
          <div style={{ marginTop: 6 }}>
            Funds will appear on OP Sepolia after derivation. This may take a
            short while.
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fff2f0",
            border: "1px solid #ffccc7",
            color: "#cf1322",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 24, color: "#8c8c8c" }}>
        Connected chain: {walletClient?.chain?.name || "—"}
      </div>
    </div>
  );
}

export default App;
