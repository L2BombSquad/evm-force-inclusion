import type { BigNumberish } from "./types.js";
import type { HexData } from "./types.js";

export function toBigInt(value: BigNumberish, label: string): bigint {
  try {
    const parsed = parseBigNumberish(value);
    if (parsed < 0) {
      throw new Error(`${label} must be non-negative`);
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${label}: ${message}`);
  }
}

function parseBigNumberish(value: BigNumberish): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error("number must be a finite integer");
    }
    return BigInt(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error("empty string");
    // Support 0x-prefixed hex or decimal strings
    if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
      return BigInt(trimmed);
    }
    // Decimal
    if (!/^[-]?\d+$/.test(trimmed)) {
      throw new Error("invalid numeric string");
    }
    return BigInt(trimmed);
  }
  throw new Error("unsupported BigNumberish type");
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
