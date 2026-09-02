import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeDeliveryPolygon } from "@/lib/deliveryZones";

export const runtime = "nodejs";

type Body = { name?: unknown; type?: unknown; polygon?: unknown; enabled?: unknown };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const body = (await request.json()) as Body;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      const name = String(body.name ?? "").trim().slice(0, 120);
      if (!name) return NextResponse.json({ error: "El nombre no puede quedar vacío" }, { status: 400 });
      updates.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(body, "type")) {
      if (body.type !== "include" && body.type !== "exclude") return NextResponse.json({ error: "Tipo de zona inválido" }, { status: 400 });
      updates.zone_type = body.type;
    }
    if (Object.prototype.hasOwnProperty.call(body, "polygon")) {
      const polygon = normalizeDeliveryPolygon(body.polygon);
      if (!polygon) return NextResponse.json({ error: "La zona necesita al menos 3 puntos válidos" }, { status: 400 });
      updates.polygon = polygon;
    }
    if (Object.prototype.hasOwnProperty.call(body, "enabled")) updates.enabled = body.enabled === true;
    const { data, error } = await supabaseAdmin
      .from("delivery_zones")
      .update(updates)
      .eq("id", id)
      .select("id,name,zone_type,polygon,enabled,sort_order,created_at,updated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "La zona no existe" }, { status: 404 });
    return NextResponse.json({ zone: data });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO ZONA:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar la zona" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const { error } = await supabaseAdmin.from("delivery_zones").delete().eq("id", id);
  if (error) {
    console.error("ERROR ELIMINANDO ZONA:", error);
    return NextResponse.json({ error: "No se pudo eliminar la zona" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
