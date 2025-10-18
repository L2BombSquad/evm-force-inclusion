import type { RollupAdapter } from "./adapter.js";

export class AdapterRegistry {
  private readonly nameToAdapter = new Map<string, RollupAdapter>();

  register(adapter: RollupAdapter): void {
    const aliases = new Set<string>([
      adapter.name,
      ...adapter.supports,
    ].map((s) => s.toLowerCase()));

    for (const alias of aliases) {
      this.nameToAdapter.set(alias, adapter);
    }
  }

  getAdapterByType(type: string): RollupAdapter | undefined {
    return this.nameToAdapter.get(type.toLowerCase());
  }
}

export function createRegistryWithAdapters(adapters: RollupAdapter[]): AdapterRegistry {
  const registry = new AdapterRegistry();
  for (const a of adapters) registry.register(a);
  return registry;
}



