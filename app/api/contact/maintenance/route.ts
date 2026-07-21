import { env } from "cloudflare:workers";
import { runConsultationMaintenance } from "@/lib/server/consultation-maintenance";

function json(data: unknown, status: number) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function tokenMatches(candidate: string, expected: string) {
  const encode = (value: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [candidateHash, expectedHash] = await Promise.all([encode(candidate), encode(expected)]);
  const left = new Uint8Array(candidateHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function POST(request: Request) {
  const maintenanceSecret = env.JUHAO_LEAD_MAINTENANCE_SECRET?.trim();
  if (!maintenanceSecret) return json({ error: "线索维护任务尚未配置" }, 503);
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token || !await tokenMatches(token, maintenanceSecret)) return json({ error: "未授权" }, 401);
  if (!env.DB) return json({ error: "咨询服务暂时不可用" }, 503);

  try {
    return json(await runConsultationMaintenance(env), 200);
  } catch {
    return json({ error: "线索维护任务执行失败" }, 503);
  }
}
