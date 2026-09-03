import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth.server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminSession();

  if (!auth.ok || !auth.user) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: auth.status }
    );
  }

  const body = (await request.json()) as { endpoint?: unknown };
  const endpoint = String(body.endpoint ?? "").trim();

  if (!endpoint) {
    return NextResponse.json(
      { error: "Falta el dispositivo a desactivar" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("admin_push_subscriptions")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("endpoint", endpoint);

  if (error) {
    console.error("ERROR ELIMINANDO PUSH SUBSCRIPTION:", error);
    return NextResponse.json(
      { error: "No se pudo desactivar este dispositivo" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
