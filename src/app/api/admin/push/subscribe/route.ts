import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth.server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type IncomingSubscription = {
  endpoint?: unknown;
  expirationTime?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

function cleanString(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();

  if (!auth.ok || !auth.user) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: auth.status }
    );
  }

  const body = (await request.json()) as IncomingSubscription;
  const endpoint = cleanString(body.endpoint, 4096);
  const p256dh = cleanString(body.keys?.p256dh, 1024);
  const authKey = cleanString(body.keys?.auth, 512);
  const userAgent = cleanString(request.headers.get("user-agent"), 1000);

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: "La suscripción de notificaciones es inválida" },
      { status: 400 }
    );
  }

  const expirationTime =
    typeof body.expirationTime === "number" && Number.isFinite(body.expirationTime)
      ? new Date(body.expirationTime).toISOString()
      : null;

  const { error } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .upsert(
      {
        user_id: auth.user.id,
        endpoint,
        p256dh,
        auth: authKey,
        expiration_time: expirationTime,
        user_agent: userAgent || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    console.error("ERROR GUARDANDO PUSH SUBSCRIPTION:", error);
    return NextResponse.json(
      { error: "No se pudo guardar este dispositivo" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
