import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isMissingTableError, PAID_ORDER_STATUSES } from "@/lib/money.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function monthBounds(month: string, half: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getUTCMonth();
  const monthNumber = String(monthIndex + 1).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const fromDay = half === "second" ? 16 : 1;
  const toDay = half === "first" ? 15 : lastDay;
  return {
    month: `${year}-${monthNumber}`,
    from: `${year}-${monthNumber}-${String(fromDay).padStart(2, "0")}`,
    to: `${year}-${monthNumber}-${String(toDay).padStart(2, "0")}`,
  };
}

type ClosureRow = {
  id: string;
  delivery_cycle_id: string;
  delivery_date: string;
  status: "draft" | "review" | "closed";
  version: number;
  product_revenue_snapshot: number | string | null;
  shipping_revenue_snapshot: number | string | null;
  total_revenue_snapshot: number | string | null;
  refund_total_snapshot: number | string | null;
  closed_at: string | null;
  updated_at: string;
};

type OrderRow = {
  id: string;
  delivery_cycle_id: string | null;
  status: string;
  subtotal: number | string | null;
  shipping: number | string | null;
  total: number | string | null;
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const bounds = monthBounds(
    searchParams.get("month") ?? "",
    searchParams.get("half") ?? "month"
  );

  try {
    // Primero buscamos los pedidos que realmente pueden formar una jornada.
    // No partimos de los últimos ciclos creados porque Altavera puede tener
    // muchos ciclos futuros vacíos y eso dejaría fuera la jornada actual.
    const [{ data: orderRows, error: orderError }, { data: closureRows, error: closureError }] =
      await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("id,delivery_cycle_id,status,subtotal,shipping,total")
          .in("status", Array.from(PAID_ORDER_STATUSES))
          .not("delivery_cycle_id", "is", null),
        supabaseAdmin
          .from("money_closures")
          .select("id,delivery_cycle_id,delivery_date,status,version,product_revenue_snapshot,shipping_revenue_snapshot,total_revenue_snapshot,refund_total_snapshot,closed_at,updated_at")
          .order("delivery_date", { ascending: false }),
      ]);

    if (orderError) throw orderError;
    if (closureError) throw closureError;

    const orders = (orderRows ?? []) as OrderRow[];
    const closures = (closureRows ?? []) as ClosureRow[];
    const cycleIds = Array.from(
      new Set([
        ...orders
          .map((order) => order.delivery_cycle_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
        ...closures.map((closure) => closure.delivery_cycle_id),
      ])
    );

    const { data: cycleRows, error: cycleError } = cycleIds.length
      ? await supabaseAdmin
          .from("delivery_cycles")
          .select("id,delivery_date,status")
          .in("id", cycleIds)
          .order("delivery_date", { ascending: false })
      : { data: [], error: null };

    if (cycleError) throw cycleError;
    const cycles = cycleRows ?? [];
    const closureByCycle = new Map(closures.map((closure) => [closure.delivery_cycle_id, closure]));

    const cycleCards = cycles.map((cycle) => {
      const cycleOrders = orders.filter(
        (order) => order.delivery_cycle_id === cycle.id && PAID_ORDER_STATUSES.has(order.status)
      );
      const currentRevenue = cycleOrders.reduce((sum, order) => sum + num(order.total), 0);
      const deliveredCount = cycleOrders.filter((order) => order.status === "delivered").length;
      const closure = closureByCycle.get(cycle.id) ?? null;
      return {
        cycleId: cycle.id,
        deliveryDate: cycle.delivery_date,
        deliveryStatus: cycle.status,
        orderCount: cycleOrders.length,
        deliveredCount,
        currentRevenue: round(currentRevenue),
        closure: closure
          ? {
              id: closure.id,
              status: closure.status,
              version: closure.version,
              totalRevenue: num(closure.total_revenue_snapshot),
              closedAt: closure.closed_at,
              updatedAt: closure.updated_at,
            }
          : null,
      };
    }).filter((card) => card.orderCount > 0 || card.closure !== null);

    const periodClosures = closures.filter(
      (closure) =>
        closure.status === "closed" &&
        closure.delivery_date >= bounds.from &&
        closure.delivery_date <= bounds.to
    );
    const periodIds = periodClosures.map((closure) => closure.id);
    const allClosed = closures.filter((closure) => closure.status === "closed");
    const allClosureIds = closures.map((closure) => closure.id);

    const [productResult, expenseResult, laborResult, splitResult, vehicleResult, usageResult, materialPurchasesResult, refundResult] =
      await Promise.all([
        allClosureIds.length
          ? supabaseAdmin.from("money_product_costs").select("closure_id,opening_stock_quantity,opening_stock_value,purchased_quantity,purchase_total,used_quantity,loss_quantity").in("closure_id", allClosureIds)
          : Promise.resolve({ data: [], error: null }),
        allClosureIds.length
          ? supabaseAdmin.from("money_expenses").select("closure_id,amount").in("closure_id", allClosureIds)
          : Promise.resolve({ data: [], error: null }),
        allClosureIds.length
          ? supabaseAdmin.from("money_labor").select("closure_id,hourly_rate,purchase_hours,packing_hours,delivery_hours").in("closure_id", allClosureIds)
          : Promise.resolve({ data: [], error: null }),
        allClosureIds.length
          ? supabaseAdmin.from("money_labor_splits").select("closure_id,percentage,paid").in("closure_id", allClosureIds)
          : Promise.resolve({ data: [], error: null }),
        allClosureIds.length
          ? supabaseAdmin.from("money_vehicle").select("closure_id,cenada_km,delivery_km,fuel_per_km,maintenance_per_km,fuel_paid").in("closure_id", allClosureIds)
          : Promise.resolve({ data: [], error: null }),
        allClosureIds.length
          ? supabaseAdmin.from("money_material_usage").select("closure_id,total_cost_snapshot").in("closure_id", allClosureIds)
          : Promise.resolve({ data: [], error: null }),
        supabaseAdmin.from("money_material_purchases").select("purchased_at,total_cost"),
        allClosureIds.length
          ? supabaseAdmin.from("money_refunds").select("closure_id,amount,paid").in("closure_id", allClosureIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    for (const result of [productResult, expenseResult, laborResult, splitResult, vehicleResult, usageResult, materialPurchasesResult, refundResult]) {
      if (result.error) throw result.error;
    }

    const products = productResult.data ?? [];
    const expenses = expenseResult.data ?? [];
    const labor = laborResult.data ?? [];
    const splits = splitResult.data ?? [];
    const vehicles = vehicleResult.data ?? [];
    const usages = usageResult.data ?? [];
    const materialPurchases = materialPurchasesResult.data ?? [];
    const refunds = refundResult.data ?? [];
    const inPeriod = (closureId: string) => periodIds.includes(closureId);

    function productMetrics(filter: (closureId: string) => boolean) {
      let purchaseCash = 0;
      let recognizedCost = 0;
      for (const row of products) {
        if (!filter(row.closure_id)) continue;
        const openingQuantity = num(row.opening_stock_quantity);
        const openingValue = num(row.opening_stock_value);
        const purchased = num(row.purchased_quantity);
        const total = num(row.purchase_total);
        const availableQuantity = openingQuantity + purchased;
        const availableValue = openingValue + total;
        purchaseCash += total;
        if (availableQuantity > 0) {
          const unitCost = availableValue / availableQuantity;
          recognizedCost += (num(row.used_quantity) + num(row.loss_quantity)) * unitCost;
        }
      }
      return { purchaseCash: round(purchaseCash), recognizedCost: round(recognizedCost) };
    }
    function laborCost(row: { hourly_rate: unknown; purchase_hours: unknown; packing_hours: unknown; delivery_hours: unknown }) {
      return num(row.hourly_rate) * (num(row.purchase_hours) + num(row.packing_hours) + num(row.delivery_hours));
    }
    function vehicleCost(row: { cenada_km: unknown; delivery_km: unknown; fuel_per_km: unknown; maintenance_per_km: unknown }) {
      const km = num(row.cenada_km) + num(row.delivery_km);
      return { fuel: km * num(row.fuel_per_km), maintenance: km * num(row.maintenance_per_km) };
    }

    const periodProducts = productMetrics(inPeriod);
    const periodGrossRevenue = periodClosures.reduce((sum, closure) => sum + num(closure.total_revenue_snapshot), 0);
    const periodRefunds = refunds.filter((row) => inPeriod(row.closure_id)).reduce((sum, row) => sum + num(row.amount), 0);
    const periodRevenue = periodGrossRevenue - periodRefunds;
    const periodProductRevenue = periodClosures.reduce((sum, closure) => sum + num(closure.product_revenue_snapshot), 0);
    const periodShippingRevenue = periodClosures.reduce((sum, closure) => sum + num(closure.shipping_revenue_snapshot), 0);
    const periodExpenses = expenses.filter((row) => inPeriod(row.closure_id)).reduce((sum, row) => sum + num(row.amount), 0);
    const periodLabor = labor.filter((row) => inPeriod(row.closure_id)).reduce((sum, row) => sum + laborCost(row), 0);
    const periodMaterialsUsed = usages.filter((row) => inPeriod(row.closure_id)).reduce((sum, row) => sum + num(row.total_cost_snapshot), 0);
    const periodVehicle = vehicles.filter((row) => inPeriod(row.closure_id)).reduce(
      (acc, row) => {
        const cost = vehicleCost(row);
        acc.fuel += cost.fuel;
        acc.maintenance += cost.maintenance;
        return acc;
      },
      { fuel: 0, maintenance: 0 }
    );
    const periodMaterialPurchases = materialPurchases
      .filter((row) => row.purchased_at >= bounds.from && row.purchased_at <= bounds.to)
      .reduce((sum, row) => sum + num(row.total_cost), 0);
    const periodProfit = periodRevenue - periodProducts.recognizedCost - periodExpenses - periodLabor - periodMaterialsUsed - periodVehicle.fuel - periodVehicle.maintenance;
    const periodAvailableGenerated = periodRevenue - periodProducts.purchaseCash - periodExpenses - periodLabor - periodMaterialPurchases - periodVehicle.fuel - periodVehicle.maintenance;

    const allProducts = productMetrics(() => true);
    const allGrossRevenue = allClosed.reduce((sum, closure) => sum + num(closure.total_revenue_snapshot), 0);
    const allClosedIds = new Set(allClosed.map((closure) => closure.id));
    const allRefunds = refunds
      .filter((row) => allClosedIds.has(row.closure_id))
      .reduce((sum, row) => sum + num(row.amount), 0);
    const allRevenue = allGrossRevenue - allRefunds;
    const allExpenses = expenses.reduce((sum, row) => sum + num(row.amount), 0);
    const allLabor = labor.reduce((sum, row) => sum + laborCost(row), 0);
    const allMaterialPurchases = materialPurchases.reduce((sum, row) => sum + num(row.total_cost), 0);
    const allVehicle = vehicles.reduce(
      (acc, row) => {
        const cost = vehicleCost(row);
        acc.fuel += cost.fuel;
        acc.maintenance += cost.maintenance;
        return acc;
      },
      { fuel: 0, maintenance: 0 }
    );
    const calculatedAvailable = allRevenue - allProducts.purchaseCash - allExpenses - allLabor - allMaterialPurchases - allVehicle.fuel - allVehicle.maintenance;

    let unpaidLabor = 0;
    for (const laborRow of labor) {
      const total = laborCost(laborRow);
      const related = splits.filter((split) => split.closure_id === laborRow.closure_id);
      const assignedPercent = related.reduce(
        (sum, split) => sum + num(split.percentage),
        0
      );
      const unpaidAssigned = related
        .filter((split) => !split.paid)
        .reduce(
          (sum, split) => sum + total * (num(split.percentage) / 100),
          0
        );
      const unassigned = total * (Math.max(0, 100 - assignedPercent) / 100);
      unpaidLabor += unpaidAssigned + unassigned;
    }
    const unpaidFuel = vehicles.filter((row) => !row.fuel_paid).reduce((sum, row) => sum + vehicleCost(row).fuel, 0);
    const maintenanceReserve = vehicles.reduce((sum, row) => sum + vehicleCost(row).maintenance, 0);
    const pendingRefunds = refunds
      .filter((row) => !row.paid)
      .reduce((sum, row) => sum + num(row.amount), 0);

    const lockedFutureOrders = orders
      .filter((order) => order.status === "confirmed" || order.status === "preparing" || order.status === "ready")
      .reduce((sum, order) => sum + num(order.total), 0);

    return NextResponse.json({
      setupRequired: false,
      period: bounds,
      cycleCards,
      summary: {
        closedJourneys: periodClosures.length,
        productRevenue: round(periodProductRevenue),
        shippingRevenue: round(periodShippingRevenue),
        totalRevenue: round(periodGrossRevenue),
        refunds: round(periodRefunds),
        netRevenue: round(periodRevenue),
        productCost: periodProducts.recognizedCost,
        productPurchaseCash: periodProducts.purchaseCash,
        materialUsage: round(periodMaterialsUsed),
        materialPurchases: round(periodMaterialPurchases),
        otherExpenses: round(periodExpenses),
        labor: round(periodLabor),
        fuel: round(periodVehicle.fuel),
        maintenance: round(periodVehicle.maintenance),
        profit: round(periodProfit),
        availableGenerated: round(periodAvailableGenerated),
      },
      current: {
        calculatedAvailable: round(calculatedAvailable),
        unpaidLabor: round(unpaidLabor),
        unpaidFuel: round(unpaidFuel),
        maintenanceReserve: round(maintenanceReserve),
        pendingRefunds: round(pendingRefunds),
        lockedFutureOrders: round(lockedFutureOrders),
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ setupRequired: true, period: bounds, cycleCards: [], summary: null, current: null });
    }
    console.error("ERROR CONTROL DINERO:", error);
    return NextResponse.json({ error: "No se pudo cargar el control de dinero" }, { status: 500 });
  }
}
