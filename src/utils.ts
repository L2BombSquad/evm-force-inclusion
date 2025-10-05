import { getBigInt } from "ethers";
import type { BigNumberish } from "ethers";
import type { HexData } from "./types.js";

export function toBigInt(value: BigNumberish, label: string): bigint {
  try {
    const parsed = getBigInt(value);
    if (parsed < 0) {
      throw new Error(`${label} must be non-negative`);
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${label}: ${message}`);
  }
}

export function normalizeHexData(data?: string): HexData {
  if (!data || data === "0x") {
    return "0x";
  }

  if (data.startsWith("0X")) {
    data = `0x${data.slice(2)}`;
  }

  if (!data.startsWith("0x")) {
    throw new Error("Data must be a 0x-prefixed hex string");
  }

  if ((data.length - 2) % 2 !== 0) {
    throw new Error("Data hex string must have an even length");
  }

  return data as HexData;
}
