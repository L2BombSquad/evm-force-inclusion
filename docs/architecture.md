# Architecture

The SDK is organized into three layers:

- Core / Engine
  - Stateless orchestration, retries, logging.
  - Works with generic interfaces; no rollup-specific code.
- Adapters (per rollup)
  - Each rollup implements a small interface and hides chain-specific details.
- Facade API
  - Simple entrypoints like `client.optimism().send(...)`, `client.arbitrum().send(...)`.

## Core

- `CoreEngine` adds retries/backoff and structured logging.
- `AdapterRegistry` maps aliases (e.g. `"arb"`, `"op"`) to adapters.
- `AdapterContext` provides `walletClient`, contract factories, defaults, and `getAccountAddress()`.

```ts
const client = new ForceInclusionClient({
  walletClient,
  core: { maxRetries: 2, retryDelayMs: 500 },
});
```

## Adapter Interface

```ts
interface RollupAdapter {
  name: string;           // e.g. "arbitrum"
  supports: string[];     // e.g. ["arb", "arbitrum"]
  sendForceInclusion(request, context): Promise<Hash>;
  executeForcedExit?(request, context): Promise<Hash>;
}
```

- `sendForceInclusion(...)` covers constructing L1 queue messages for the rollup.
- `executeForcedExit(...)` is optional for full flows (enqueue + prove + finalize) where relevant.

## Built-in Adapters

- `ArbitrumAdapter` → Inbox `createRetryableTicket`
- `OptimismAdapter` → OptimismPortal `depositTransaction`

## Extensibility

Author a new adapter and register it at runtime:

```ts
client.registerAdapter(myAdapter);
await client.rollup('my').send({ /* request typed by your adapter */ } as any);
```

