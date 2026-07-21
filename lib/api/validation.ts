import type { ContactReceipt } from "./types";

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 必须是对象`);
  return value as JsonRecord;
}

function string(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 必须是非空字符串`);
  return value;
}

export function unwrapData(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value) && "data" in value) return (value as JsonRecord).data;
  return value;
}

export function parseContactReceipt(value: unknown): ContactReceipt {
  const data = record(value, "contactReceipt");
  const status = string(data.status, "contactReceipt.status");
  if (status !== "received") throw new Error("contactReceipt.status 无效");
  return { id: string(data.id, "contactReceipt.id"), status, submittedAt: string(data.submittedAt, "contactReceipt.submittedAt") };
}
