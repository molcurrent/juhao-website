import type { ContactRequest, ContactReceipt } from "./types";
import { parseContactReceipt, unwrapData } from "./validation";

export async function submitContact(request: ContactRequest): Promise<ContactReceipt> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch("/api/contact", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : "咨询提交失败，请稍后重试";
    throw new Error(message);
  }

  return parseContactReceipt(unwrapData(body));
}
