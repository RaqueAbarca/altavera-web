import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeDeliveryPolygon } from "@/lib/deliveryZones";

export const runtime = "nodejs";

type Body = {
  name?: unknown;
  type?: unknown;
  polygon?: unknown;
  enabled?: unknown;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("id,name,zone_type,polygon,enabled,sort_order,created_at,updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    console.error("ERROR CARGANDO COBERTURA ADMIN:", error);
    return NextResponse.json({ error: "No se pudieron cargar las zonas. Verifica que la migración de delivery_zones esté aplicada." }, { status: 500 });
  }
  return NextResponse.json({ zones: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as Body;
    const name = String(body.name ?? "").trim().slice(0, 120);
    const type = body.type === "exclude" ? "exclude" : body.type === "include" ? "include" : null;
    const polygon = normalizeDeliveryPolygon(body.polygon);
    if (!name) return NextResponse.json({ error: "Escribe un nombre para la zona" }, { status: 400 });
    if (!type) return NextResponse.json({ error: "Tipo de zona inválido" }, { status: 400 });
    if (!polygon) return NextResponse.json({ error: "La zona necesita al menos 3 puntos válidos" }, { status: 400 });
    const { data: last } = await supabaseAdmin
      .from("delivery_zones")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabaseAdmin
      .from("delivery_zones")
      .insert({
        id: randomUUID(),
        name,
        zone_type: type,
        polygon,
        enabled: body.enabled !== false,
        sort_order: Number(last?.sort_order ?? -1) + 1,
      })
      .select("id,name,zone_type,polygon,enabled,sort_order,created_at,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ zone: data }, { status: 201 });
  } catch (error) {
    console.error("ERROR CREANDO ZONA:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear la zona" }, { status: 500 });
  }
}
