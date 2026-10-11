import { NextResponse } from "next/server";
import { validatePromoCode } from "@/lib/promoCodes.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { code?: unknown };
    const result = await validatePromoCode(body.code);

    if (!result.valid || !result.promo) {
      return NextResponse.json(
        { valid: false, error: "Código promocional inválido o no disponible." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        code: result.promo.code,
        label: result.promo.label || "Envío gratis",
        discountType: result.promo.discount_type,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ERROR VALIDANDO CÓDIGO PROMOCIONAL:", error);
    return NextResponse.json(
      { valid: false, error: "No se pudo validar el código promocional." },
      { status: 500 }
    );
  }
}
