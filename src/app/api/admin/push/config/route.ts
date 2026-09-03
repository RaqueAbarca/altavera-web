import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminSession();

  if (!auth.ok) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: auth.status }
    );
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();

  if (!publicKey) {
    return NextResponse.json(
      {
        error:
          "Las notificaciones todavía no están configuradas en el servidor.",
        configured: false,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey, configured: true });
}
