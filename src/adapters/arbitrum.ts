import type { Hash } from "viem";
import type { RollupAdapter, AdapterContext } from "../core/adapter.js";
import type { ArbitrumRetryableTicketRequest } from "../types.js";
import { normalizeHexData, toBigInt } from "../utils.js";

export const ArbitrumAdapter: RollupAdapter = {
  name: "arbitrum",
  supports: ["arb", "arbitrum"],
  async sendForceInclusion(request, context): Promise<Hash> {
    const { factories, walletClient, getAccountAddress, defaultArbitrumInboxAddress } = context;

    const req = request as Omit<ArbitrumRetryableTicketRequest, "inboxAddress"> & { inboxAddress?: string };
    const inboxAddress = (req.inboxAddress || defaultArbitrumInboxAddress).toLowerCase();
    const inbox = factories.createArbitrumInbox(inboxAddress, walletClient);

    const l2CallValue = toBigInt(req.l2CallValue, "l2CallValue");
    const maxSubmissionCost = toBigInt(req.maxSubmissionCost, "maxSubmissionCost");
    const maxGas = toBigInt(req.maxGas, "maxGas");
    const gasPriceBid = toBigInt(req.gasPriceBid, "gasPriceBid");
    const data = normalizeHexData(req.data);

    const refundAddress = req.excessFeeRefundAddress ?? (await getAccountAddress());
    const callValueRefundAddress = req.callValueRefundAddress ?? refundAddress;
    const msgValue = maxSubmissionCost + l2CallValue + gasPriceBid * maxGas;

    const normalized: ArbitrumRetryableTicketRequest = {
      to: req.to,
      l2CallValue,
      maxSubmissionCost,
      maxGas,
      gasPriceBid,
      data,
      excessFeeRefundAddress: refundAddress,
      callValueRefundAddress,
      inboxAddress,
    };

    return inbox.createRetryableTicket(
      normalized.to,
      normalized.l2CallValue,
      normalized.maxSubmissionCost,
      normalized.excessFeeRefundAddress!,
      normalized.callValueRefundAddress!,
      normalized.maxGas,
      normalized.gasPriceBid,
      normalized.data ?? "0x",
      { value: msgValue }
    );
  },
};


