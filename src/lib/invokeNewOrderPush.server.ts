type NewOrderPushPayload = {
  test?: boolean;
  orderId?: string;
  total?: number;
  deliveryDate?: string;
};

export async function invokeNewOrderPush(payload: NewOrderPushPayload) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const internalSecret = process.env.ALTAVERA_PUSH_INTERNAL_SECRET;

  if (!supabaseUrl || !internalSecret) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL o ALTAVERA_PUSH_INTERNAL_SECRET"
    );
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/new-order-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-altavera-push-secret": internalSecret,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const raw = await response.text();
  let data: unknown = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "error" in data
        ? String((data as { error?: unknown }).error ?? "")
        : typeof data === "string"
          ? data
          : "";

    throw new Error(
      `new-order-push respondió ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }

  return data;
}
