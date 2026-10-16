import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isMissingTableError } from "@/lib/money.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

async function loadMaterials() {
  const [materialsResult, purchasesResult, usagesResult] = await Promise.all([
    supabaseAdmin.from("money_materials").select("*").order("active", { ascending: false }).order("name"),
    supabaseAdmin.from("money_material_purchases").select("*").order("purchased_at", { ascending: false }).order("created_at", { ascending: false }),
    supabaseAdmin.from("money_material_usage").select("material_id,quantity,total_cost_snapshot"),
  ]);
  for (const result of [materialsResult, purchasesResult, usagesResult]) {
    if (result.error) throw result.error;
  }
  const purchases = purchasesResult.data ?? [];
  const usages = usagesResult.data ?? [];
  return (materialsResult.data ?? []).map((material) => {
    const materialPurchases = purchases.filter((row) => row.material_id === material.id);
    const materialUsages = usages.filter((row) => row.material_id === material.id);
    const purchasedQuantity = materialPurchases.reduce((sum, row) => sum + num(row.quantity), 0);
    const purchasedValue = materialPurchases.reduce((sum, row) => sum + num(row.total_cost), 0);
    const usedQuantity = materialUsages.reduce((sum, row) => sum + num(row.quantity), 0);
    const usedValue = materialUsages.reduce((sum, row) => sum + num(row.total_cost_snapshot), 0);
    const remainingQuantity = purchasedQuantity - usedQuantity;
    const remainingValue = purchasedValue - usedValue;
    return {
      ...material,
      purchasedQuantity: round(purchasedQuantity, 3),
      usedQuantity: round(usedQuantity, 3),
      remainingQuantity: round(remainingQuantity, 3),
      remainingValue: round(remainingValue),
      currentUnitCost: remainingQuantity > 0 ? round(remainingValue / remainingQuantity, 6) : null,
      purchases: materialPurchases,
    };
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ materials: await loadMaterials() });
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: "Primero aplica APLICAR_CONTROL_DINERO_20261016.sql en Supabase." }, { status: 409 });
    console.error("ERROR MATERIALES DINERO:", error);
    return NextResponse.json({ error: "No se pudieron cargar los materiales" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as {
      action?: "createMaterial" | "addPurchase";
      name?: string;
      unit?: "g" | "unit";
      materialId?: string;
      purchasedAt?: string;
      quantity?: number;
      totalCost?: number;
      notes?: string;
    };
    if (body.action === "createMaterial") {
      const name = body.name?.trim();
      if (!name) return NextResponse.json({ error: "Escribe el nombre del material." }, { status: 400 });
      if (body.unit !== "g" && body.unit !== "unit") return NextResponse.json({ error: "Selecciona gramos o unidades." }, { status: 400 });
      const { error } = await supabaseAdmin.from("money_materials").insert({ name, unit: body.unit, created_by: auth.user.id });
      if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "Ese material ya existe." }, { status: 400 });
        throw error;
      }
    } else if (body.action === "addPurchase") {
      if (!body.materialId) return NextResponse.json({ error: "Selecciona un material." }, { status: 400 });
      if (num(body.quantity) <= 0) return NextResponse.json({ error: "La cantidad comprada debe ser mayor que cero." }, { status: 400 });
      if (num(body.totalCost) < 0) return NextResponse.json({ error: "El costo no puede ser negativo." }, { status: 400 });
      const { error } = await supabaseAdmin.from("money_material_purchases").insert({
        material_id: body.materialId,
        purchased_at: body.purchasedAt || new Date().toISOString().slice(0, 10),
        quantity: num(body.quantity),
        total_cost: num(body.totalCost),
        notes: body.notes?.trim() || null,
        created_by: auth.user.id,
      });
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }
    return NextResponse.json({ materials: await loadMaterials() });
  } catch (error) {
    if (isMissingTableError(error)) return NextResponse.json({ error: "Primero aplica APLICAR_CONTROL_DINERO_20261016.sql en Supabase." }, { status: 409 });
    console.error("ERROR GUARDAR MATERIAL:", error);
    return NextResponse.json({ error: "No se pudo guardar el material" }, { status: 500 });
  }
}
