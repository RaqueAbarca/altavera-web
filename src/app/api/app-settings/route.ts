import { NextResponse } from "next/server";
import { getPublicAppSettings } from "@/lib/appSettings.server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getPublicAppSettings();
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("ERROR CARGANDO CONFIGURACIÓN PÚBLICA:", error);
    return NextResponse.json(
      {
        error:
          "No se pudo cargar la configuración operativa. Revisa que la migración app_settings esté aplicada en Supabase.",
      },
      { status: 503 }
    );
  }
}
