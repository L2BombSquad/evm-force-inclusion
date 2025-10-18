import type { Hash } from "viem";
import type { RollupAdapter, AdapterContext } from "../core/adapter.js";
import type { OptimismDepositRequest } from "../types.js";
import { normalizeHexData, toBigInt } from "../utils.js";

export const OptimismAdapter: RollupAdapter = {
  name: "optimism",
  supports: ["op", "optimism", "base", "opstack"],
  async sendForceInclusion(request, context): Promise<Hash> {
    const { factories, walletClient, defaultOptimismPortalAddress } = context;

    const opReq = request as Omit<OptimismDepositRequest, "portalAddress"> & { portalAddress?: string };
    const portalAddress = (opReq.portalAddress || defaultOptimismPortalAddress).toLowerCase();
    const portal = factories.createOptimismPortal(portalAddress, walletClient);

    const value = toBigInt(opReq.value, "value");
    const gasLimit = toBigInt(opReq.gasLimit, "gasLimit");
    const isCreation = opReq.isCreation ?? false;
    const data = normalizeHexData(opReq.data);

    return portal.depositTransaction(opReq.to, value, gasLimit, isCreation, data, { value });
  },
};


