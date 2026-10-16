import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function csvCell(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}
function bounds(month: string, half: string) {
  const safe = /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = safe.split("-").map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const fromDay = half === "second" ? 16 : 1;
  const toDay = half === "first" ? 15 : last;
  return {
    month: safe,
    from: `${safe}-${String(fromDay).padStart(2, "0")}`,
    to: `${safe}-${String(toDay).padStart(2, "0")}`,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const period = bounds(url.searchParams.get("month") ?? "", url.searchParams.get("half") ?? "month");

  try {
    const { data: closures, error: closureError } = await supabaseAdmin
      .from("money_closures")
      .select("id,delivery_date,product_revenue_snapshot,shipping_revenue_snapshot,total_revenue_snapshot,closed_at")
      .eq("status", "closed")
      .gte("delivery_date", period.from)
      .lte("delivery_date", period.to)
      .order("delivery_date");
    if (closureError) throw closureError;
    const ids = (closures ?? []).map((row) => row.id);

    const [productsResult, expensesResult, laborResult, vehicleResult, usageResult] = await Promise.all([
      ids.length ? supabaseAdmin.from("money_product_costs").select("closure_id,opening_stock_quantity,opening_stock_value,purchased_quantity,purchase_total,used_quantity,loss_quantity").in("closure_id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? supabaseAdmin.from("money_expenses").select("closure_id,amount").in("closure_id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? supabaseAdmin.from("money_labor").select("closure_id,hourly_rate,purchase_hours,packing_hours,delivery_hours").in("closure_id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? supabaseAdmin.from("money_vehicle").select("closure_id,cenada_km,delivery_km,fuel_per_km,maintenance_per_km").in("closure_id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? supabaseAdmin.from("money_material_usage").select("closure_id,total_cost_snapshot").in("closure_id", ids) : Promise.resolve({ data: [], error: null }),
    ]);
    for (const result of [productsResult, expensesResult, laborResult, vehicleResult, usageResult]) if (result.error) throw result.error;

    const header = [
      "Fecha", "Productos cobrados", "Envíos cobrados", "Total cobrado", "Costo productos utilizado/pérdida",
      "Compras de productos (salida de efectivo)", "Materiales consumidos", "Otros gastos", "Trabajo", "Gasolina", "Reserva mantenimiento", "Resultado Altavera"
    ];
    const lines = [header.map(csvCell).join(";")];
    for (const closure of closures ?? []) {
      const products = (productsResult.data ?? []).filter((row) => row.closure_id === closure.id);
      let recognized = 0;
      let purchaseCash = 0;
      for (const row of products) {
        const openingQuantity = num(row.opening_stock_quantity);
        const openingValue = num(row.opening_stock_value);
        const purchased = num(row.purchased_quantity);
        const total = num(row.purchase_total);
        const availableQuantity = openingQuantity + purchased;
        const availableValue = openingValue + total;
        purchaseCash += total;
        if (availableQuantity > 0) {
          recognized +=
            (num(row.used_quantity) + num(row.loss_quantity)) *
            (availableValue / availableQuantity);
        }
      }
      const expenses = (expensesResult.data ?? []).filter((row) => row.closure_id === closure.id).reduce((sum, row) => sum + num(row.amount), 0);
      const materials = (usageResult.data ?? []).filter((row) => row.closure_id === closure.id).reduce((sum, row) => sum + num(row.total_cost_snapshot), 0);
      const laborRow = (laborResult.data ?? []).find((row) => row.closure_id === closure.id);
      const labor = laborRow ? num(laborRow.hourly_rate) * (num(laborRow.purchase_hours) + num(laborRow.packing_hours) + num(laborRow.delivery_hours)) : 0;
      const vehicleRow = (vehicleResult.data ?? []).find((row) => row.closure_id === closure.id);
      const km = vehicleRow ? num(vehicleRow.cenada_km) + num(vehicleRow.delivery_km) : 0;
      const fuel = vehicleRow ? km * num(vehicleRow.fuel_per_km) : 0;
      const maintenance = vehicleRow ? km * num(vehicleRow.maintenance_per_km) : 0;
      const totalRevenue = num(closure.total_revenue_snapshot);
      const profit = totalRevenue - recognized - materials - expenses - labor - fuel - maintenance;
      lines.push([
        closure.delivery_date,
        num(closure.product_revenue_snapshot),
        num(closure.shipping_revenue_snapshot),
        totalRevenue,
        recognized,
        purchaseCash,
        materials,
        expenses,
        labor,
        fuel,
        maintenance,
        profit,
      ].map((value) => csvCell(typeof value === "number" ? Math.round(value * 100) / 100 : value)).join(";"));
    }

    const body = `\uFEFF${lines.join("\r\n")}`;
    const suffix = url.searchParams.get("half") === "first" ? "_1-15" : url.searchParams.get("half") === "second" ? "_16-fin" : "";
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="altavera_dinero_${period.month}${suffix}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ERROR EXPORTAR DINERO:", error);
    return NextResponse.json({ error: "No se pudo exportar el reporte" }, { status: 500 });
  }
}
