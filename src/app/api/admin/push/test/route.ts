import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth.server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireAdminSession();

  if (!auth.ok) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: auth.status }
    );
  }

  try {
    const { data, error } = await supabaseAdmin.functions.invoke(
      "new-order-push",
      { body: { test: true } }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, result: data ?? null });
  } catch (error) {
    console.error("ERROR ENVIANDO PUSH DE PRUEBA:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo enviar la notificación de prueba",
      },
      { status: 500 }
    );
  }
}
