import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePromoCode } from "@/lib/promoCodes.server";

export const runtime = "nodejs";

type PromoBody = {
  code?: unknown;
  label?: unknown;
  isActive?: unknown;
  startsAt?: unknown;
  expiresAt?: unknown;
  maxUses?: unknown;
};

function cleanText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function parseNullableDate(value: unknown, field: string) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} no es una fecha válida.`);
  return date.toISOString();
}

function parseMaxUses(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100000) {
    throw new Error("El máximo de usos debe ser un número entero mayor a 0.");
  }
  return parsed;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as PromoBody;
    const code = normalizePromoCode(body.code);
    const label = cleanText(body.label) || "Envío gratis";
    const startsAt = parseNullableDate(body.startsAt, "La fecha de inicio");
    const expiresAt = parseNullableDate(body.expiresAt, "La fecha de vencimiento");
    const maxUses = parseMaxUses(body.maxUses);

    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      return NextResponse.json(
        { error: "El código debe tener entre 3 y 40 caracteres y usar solo letras, números, guion o guion bajo." },
        { status: 400 }
      );
    }

    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
      return NextResponse.json({ error: "El vencimiento debe ser posterior al inicio." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("promo_codes")
      .update({
        code,
        label,
        is_active: body.isActive === true,
        starts_at: startsAt,
        expires_at: expiresAt,
        max_uses: maxUses,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,code,label,discount_type,is_active,starts_at,expires_at,max_uses,use_count,created_at,updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Ya existe un código con ese nombre." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ promoCode: data });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO CÓDIGO PROMOCIONAL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar el código promocional." },
      { status: 400 }
    );
  }
}
