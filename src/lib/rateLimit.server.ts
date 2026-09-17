import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  configured: boolean;
};

function firstForwardedIp(value: string | null) {
  return String(value ?? "")
    .split(",")[0]
    ?.trim();
}

export function getClientFingerprint(request: Request) {
  const ip =
    firstForwardedIp(request.headers.get("x-forwarded-for")) ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown";

  return createHash("sha256")
    .update(`altavera:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export function hashRateLimitValue(value: string) {
  return createHash("sha256")
    .update(`altavera:${value.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

export async function consumeRateLimit({
  key,
  limit,
  windowSeconds,
}: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const { data, error } = await supabaseAdmin.rpc("consume_api_rate_limit", {
    p_key: key.slice(0, 180),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Mantener el sitio disponible si la migración todavía no fue aplicada o
    // Supabase tiene un problema temporal. El error queda visible en logs.
    console.error("RATE LIMIT NO DISPONIBLE:", error);
    return {
      allowed: true,
      retryAfterSeconds: 0,
      configured: false,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    allowed: row?.allowed !== false,
    retryAfterSeconds: Math.max(0, Number(row?.retry_after_seconds ?? 0)),
    configured: true,
  };
}
