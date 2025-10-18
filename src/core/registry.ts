import type { RollupAdapter } from "./adapter.js";

export class AdapterRegistry {
  private readonly nameToAdapter = new Map<string, RollupAdapter>();
  private readonly methodNameToAlias = new Map<string, string>();

  register(adapter: RollupAdapter): void {
    const aliases = new Set<string>([
      adapter.name,
      ...adapter.supports,
    ].map((s) => s.toLowerCase()));

    for (const alias of aliases) {
      this.nameToAdapter.set(alias, adapter);
    }

    // Suggest a method name on the client using the primary name
    const methodName = toMethodName(adapter.name);
    if (!this.methodNameToAlias.has(methodName)) {
      this.methodNameToAlias.set(methodName, adapter.name.toLowerCase());
    }
  }

  getAdapterByType(type: string): RollupAdapter | undefined {
    return this.nameToAdapter.get(type.toLowerCase());
  }

  getPreferredMethodName(adapter: RollupAdapter): string {
    const methodName = toMethodName(adapter.name);
    return methodName;
  }
}

export function createRegistryWithAdapters(adapters: RollupAdapter[]): AdapterRegistry {
  const registry = new AdapterRegistry();
  for (const a of adapters) registry.register(a);
  return registry;
}

function toMethodName(name: string): string {
  // Convert names like "My Rollup" or "zksync-era" → "myRollup" / "zksyncEra"
  const parts = name.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/);
  if (parts.length === 0) return "adapter";
  const [first, ...rest] = parts;
  return [first.toLowerCase(), ...rest.map((p) => p.charAt(0).toUpperCase() + p.slice(1))].join("");
}



