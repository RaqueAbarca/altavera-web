import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  calculateProductAccounting,
  getMoneyCycleSource,
  getMoneyVehicleSuggestion,
  isMissingTableError,
  type MoneyProductSource,
} from "@/lib/money.server";

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
function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

type RouteContext = { params: Promise<{ cycleId: string }> };

type ProductInput = {
  itemKey: string;
  unavailable?: boolean;
  purchasedQuantity: number | null;
  purchaseTotal: number | null;
  usedQuantity: number | null;
  leftoverQuantity: number | null;
  lossQuantity: number | null;
};
type ExpenseInput = { concept: string; amount: number; notes?: string };
type SplitInput = { personName: string; percentage: number; paid: boolean };
type MaterialUsageInput = { materialId: string; quantity: number };
type RefundInput = { orderItemId: string; paid: boolean };

type SaveBody = {
  expectedVersion?: number;
  action?: "save" | "close" | "reopen" | "refunds";
  notes?: string;
  products?: ProductInput[];
  expenses?: ExpenseInput[];
  labor?: {
    hourlyRate: number;
    purchaseHours: number;
    packingHours: number;
    deliveryHours: number;
  };
  splits?: SplitInput[];
  vehicle?: {
    cenadaKm: number;
    deliveryKm: number;
    fuelPerKm: number;
    maintenancePerKm: number;
    fuelPaid: boolean;
  };
  materialUsages?: MaterialUsageInput[];
  refunds?: RefundInput[];
};

async function ensureDraftClosure(cycleId: string, userId: string) {
  const source = await getMoneyCycleSource(cycleId);
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("money_closures")
    .select("*")
    .eq("delivery_cycle_id", cycleId)
    .maybeSingle();
  if (existingError) throw existingError;

  let closure = existing;
  if (!closure) {
    const { data, error } = await supabaseAdmin
      .from("money_closures")
      .insert({
        delivery_cycle_id: cycleId,
        delivery_date: source.deliveryDate,
        status: "draft",
        version: 1,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    closure = data;
  }

  if (closure.status !== "closed") {
    const sourceKeys = new Set(source.products.map((product) => product.itemKey));
    const { data: savedRows, error: savedError } = await supabaseAdmin
      .from("money_product_costs")
      .select("item_key")
      .eq("closure_id", closure.id);
    if (savedError) throw savedError;
    const savedKeys = new Set((savedRows ?? []).map((row) => row.item_key));

    const missingProducts = source.products.filter(
      (product) => !savedKeys.has(product.itemKey)
    );
    const openingByKey = new Map<string, { quantity: number; value: number }>();
    if (missingProducts.length) {
      const { data: priorClosures, error: priorClosuresError } = await supabaseAdmin
        .from("money_closures")
        .select("id,delivery_date")
        .eq("status", "closed")
        .lt("delivery_date", source.deliveryDate)
        .order("delivery_date", { ascending: false });
      if (priorClosuresError) throw priorClosuresError;
      const priorIds = (priorClosures ?? []).map((row) => row.id);
      if (priorIds.length) {
        const { data: priorCosts, error: priorCostsError } = await supabaseAdmin
          .from("money_product_costs")
          .select(
            "closure_id,item_key,opening_stock_quantity,opening_stock_value,purchased_quantity,purchase_total,used_quantity,leftover_quantity,loss_quantity"
          )
          .in("closure_id", priorIds)
          .in(
            "item_key",
            missingProducts.map((product) => product.itemKey)
          );
        if (priorCostsError) throw priorCostsError;
        const costByClosureAndKey = new Map(
          (priorCosts ?? []).map((row) => [
            `${row.closure_id}::${row.item_key}`,
            row,
          ])
        );
        for (const product of missingProducts) {
          for (const priorClosure of priorClosures ?? []) {
            const previous = costByClosureAndKey.get(
              `${priorClosure.id}::${product.itemKey}`
            );
            if (!previous) continue;
            const accounting = calculateProductAccounting(previous);
            openingByKey.set(product.itemKey, {
              quantity: accounting.leftover,
              value: accounting.leftoverValue ?? 0,
            });
            break;
          }
        }
      }
    }

    const missingRows = missingProducts.map((product) => {
      const opening = openingByKey.get(product.itemKey) ?? { quantity: 0, value: 0 };
      return {
        closure_id: closure.id,
        item_key: product.itemKey,
        product_id: product.productId,
        product_name_snapshot: product.productName,
        unit_snapshot: product.unit,
        maturity_preference: product.maturityPreference,
        needed_quantity: product.neededQuantity,
        opening_stock_quantity: opening.quantity,
        opening_stock_value: opening.value,
        used_quantity: product.neededQuantity,
        leftover_quantity: Math.max(0, opening.quantity - product.neededQuantity),
        loss_quantity: 0,
        cenada_reference_price: product.cenadaReferencePrice,
        cenada_reference_date: product.cenadaReferenceDate,
      };
    });
    if (missingRows.length) {
      const { error } = await supabaseAdmin.from("money_product_costs").insert(missingRows);
      if (error) throw error;
    }

    for (const product of source.products) {
      if (!savedKeys.has(product.itemKey)) continue;
      const { error } = await supabaseAdmin
        .from("money_product_costs")
        .update({
          needed_quantity: product.neededQuantity,
          cenada_reference_price: product.cenadaReferencePrice,
          cenada_reference_date: product.cenadaReferenceDate,
          updated_at: new Date().toISOString(),
        })
        .eq("closure_id", closure.id)
        .eq("item_key", product.itemKey);
      if (error) throw error;
    }

    const staleKeys = [...savedKeys].filter((key) => !sourceKeys.has(key));
    if (staleKeys.length) {
      const { error } = await supabaseAdmin
        .from("money_product_costs")
        .delete()
        .eq("closure_id", closure.id)
        .in("item_key", staleKeys);
      if (error) throw error;
    }
  }

  return { closure, source };
}

async function loadClosureDetail(cycleId: string, userId: string) {
  const { closure, source } = await ensureDraftClosure(cycleId, userId);
  const [productsResult, expensesResult, laborResult, splitsResult, vehicleResult, materialsResult, usageResult, purchasesResult, historyResult, refundsResult] =
    await Promise.all([
      supabaseAdmin.from("money_product_costs").select("*").eq("closure_id", closure.id).order("product_name_snapshot"),
      supabaseAdmin.from("money_expenses").select("*").eq("closure_id", closure.id).order("created_at"),
      supabaseAdmin.from("money_labor").select("*").eq("closure_id", closure.id).maybeSingle(),
      supabaseAdmin.from("money_labor_splits").select("*").eq("closure_id", closure.id).order("person_name"),
      supabaseAdmin.from("money_vehicle").select("*").eq("closure_id", closure.id).maybeSingle(),
      supabaseAdmin.from("money_materials").select("*").eq("active", true).order("name"),
      supabaseAdmin.from("money_material_usage").select("*").eq("closure_id", closure.id),
      supabaseAdmin.from("money_material_purchases").select("material_id,quantity,total_cost"),
      supabaseAdmin.from("money_closure_history").select("id,version,action,changed_at").eq("closure_id", closure.id).order("changed_at", { ascending: false }).limit(12),
      supabaseAdmin.from("money_refunds").select("*").eq("closure_id", closure.id).order("customer_name_snapshot"),
    ]);
  for (const result of [productsResult, expensesResult, laborResult, splitsResult, vehicleResult, materialsResult, usageResult, purchasesResult, historyResult, refundsResult]) {
    if (result.error) throw result.error;
  }

  const products = (productsResult.data ?? []).map((row) => {
    const accounting = calculateProductAccounting(row);
    if (!row.unavailable) return { ...row, accounting };
    return {
      ...row,
      accounting: {
        ...accounting,
        usedCost: 0,
        lossCost: 0,
        leftoverValue: accounting.leftoverValue ?? num(row.opening_stock_value),
        reconciles: true,
        complete: true,
      },
    };
  });
  const materialUsageById = new Map((usageResult.data ?? []).map((row) => [row.material_id, row]));
  const materials = (materialsResult.data ?? []).map((material) => {
    const purchasedQuantity = (purchasesResult.data ?? [])
      .filter((row) => row.material_id === material.id)
      .reduce((sum, row) => sum + num(row.quantity), 0);
    return {
      ...material,
      purchasedQuantity,
      currentUsage: materialUsageById.get(material.id) ?? null,
    };
  });

  const materialIds = materials.map((material) => material.id);
  let allUsages: Array<{ material_id: string; quantity: number | string; total_cost_snapshot: number | string }> = [];
  if (materialIds.length) {
    const { data, error } = await supabaseAdmin
      .from("money_material_usage")
      .select("material_id,quantity,total_cost_snapshot")
      .in("material_id", materialIds);
    if (error) throw error;
    allUsages = data ?? [];
  }
  const normalizedMaterials = materials.map((material) => {
    const purchasedValue = (purchasesResult.data ?? [])
      .filter((row) => row.material_id === material.id)
      .reduce((sum, row) => sum + num(row.total_cost), 0);
    const usedQuantity = allUsages
      .filter((row) => row.material_id === material.id)
      .reduce((sum, row) => sum + num(row.quantity), 0);
    const usedValue = allUsages
      .filter((row) => row.material_id === material.id)
      .reduce((sum, row) => sum + num(row.total_cost_snapshot), 0);
    return {
      ...material,
      remainingQuantity: round(material.purchasedQuantity - usedQuantity, 3),
      remainingValue: round(purchasedValue - usedValue),
    };
  });

  let labor = laborResult.data;
  if (!labor) {
    let hourlyRate = 0;
    if (closure.status !== "closed") {
      const { data: latestLabor, error: latestLaborError } = await supabaseAdmin
        .from("money_labor")
        .select("hourly_rate")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestLaborError) throw latestLaborError;
      hourlyRate = num(latestLabor?.hourly_rate);
    }
    labor = {
      hourly_rate: hourlyRate,
      purchase_hours: 0,
      packing_hours: 0,
      delivery_hours: 0,
    };
  }

  const vehicleAuto = closure.status === "closed"
    ? null
    : await getMoneyVehicleSuggestion(cycleId);
  let vehicle = vehicleResult.data;
  if (vehicleAuto?.ready) {
    vehicle = {
      cenada_km: vehicleAuto.cenadaKm,
      delivery_km: vehicleAuto.deliveryKm,
      fuel_per_km: vehicleAuto.fuelPerKm,
      maintenance_per_km: vehicleAuto.maintenancePerKm,
      fuel_paid: Boolean(vehicleResult.data?.fuel_paid),
    };
  } else if (!vehicle) {
    vehicle = {
      cenada_km: 0,
      delivery_km: 0,
      fuel_per_km: 0,
      maintenance_per_km: 0,
      fuel_paid: false,
    };
  }
  const totalHours = num(labor.purchase_hours) + num(labor.packing_hours) + num(labor.delivery_hours);
  const laborTotal = totalHours * num(labor.hourly_rate);
  const totalKm = num(vehicle.cenada_km) + num(vehicle.delivery_km);
  const fuel = totalKm * num(vehicle.fuel_per_km);
  const maintenance = totalKm * num(vehicle.maintenance_per_km);
  const productRecognized = products.reduce((sum, product) => sum + num(product.accounting.usedCost) + num(product.accounting.lossCost), 0);
  const productCash = products.reduce((sum, product) => sum + num(product.purchase_total), 0);
  const materialsUsed = (usageResult.data ?? []).reduce((sum, row) => sum + num(row.total_cost_snapshot), 0);
  const otherExpenses = (expensesResult.data ?? []).reduce((sum, row) => sum + num(row.amount), 0);
  const refunds = refundsResult.data ?? [];
  const refundTotal = refunds.reduce((sum, row) => sum + num(row.amount), 0);
  const refundPending = refunds.filter((row) => !row.paid).reduce((sum, row) => sum + num(row.amount), 0);
  const grossRevenue = closure.status === "closed" ? num(closure.total_revenue_snapshot) : source.totalRevenue;
  const revenue = grossRevenue - refundTotal;
  const completeProducts = products.length > 0 && products.every((product) => product.accounting.complete && product.accounting.reconciles);
  const splitTotal = (splitsResult.data ?? []).reduce((sum, split) => sum + num(split.percentage), 0);
  const splitsValid = laborTotal === 0 || Math.abs(splitTotal - 100) <= 0.01;
  const nonDeliveredCount = ((source.snapshot.orders as Array<{ status?: string }>) ?? []).filter((order) => order.status !== "delivered").length;
  const profit = completeProducts ? revenue - productRecognized - materialsUsed - otherExpenses - laborTotal - fuel - maintenance : null;

  return {
    closure,
    source,
    changedAfterClose: closure.status === "closed" && Boolean(closure.order_snapshot_hash) && closure.order_snapshot_hash !== source.snapshotHash,
    products,
    expenses: expensesResult.data ?? [],
    labor,
    splits: splitsResult.data ?? [],
    vehicle,
    vehicleAuto,
    refunds,
    materials: normalizedMaterials,
    materialUsages: usageResult.data ?? [],
    history: historyResult.data ?? [],
    totals: {
      grossRevenue: round(grossRevenue),
      refundTotal: round(refundTotal),
      refundPending: round(refundPending),
      revenue: round(revenue),
      productRecognizedCost: round(productRecognized),
      productPurchaseCash: round(productCash),
      materialUsageCost: round(materialsUsed),
      otherExpenses: round(otherExpenses),
      labor: round(laborTotal),
      fuel: round(fuel),
      maintenance: round(maintenance),
      profit: profit === null ? null : round(profit),
      completeProducts,
      splitsValid,
      nonDeliveredCount,
    },
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { cycleId } = await context.params;
  try {
    return NextResponse.json(await loadClosureDetail(cycleId, auth.user.id));
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: "Falta aplicar la migración de Dinero. Ejecuta APLICAR_CONTROL_DINERO_20261016.sql y APLICAR_JEEP_REEMBOLSOS_20261016.sql en Supabase." }, { status: 409 });
    }
    console.error("ERROR DETALLE CIERRE:", error);
    return NextResponse.json({ error: "No se pudo cargar la jornada" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { cycleId } = await context.params;

  try {
    const body = (await request.json()) as SaveBody;
    const { closure, source } = await ensureDraftClosure(cycleId, auth.user.id);
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion !== Number(closure.version)) {
      return NextResponse.json({ error: "Esta jornada cambió mientras la tenías abierta. Recarga antes de guardar.", conflict: true }, { status: 409 });
    }

    if (body.action === "refunds") {
      const refundState = new Map(
        (body.refunds ?? []).map((refund) => [cleanText(refund.orderItemId), Boolean(refund.paid)])
      );
      const { data: existingRefunds, error: refundsError } = await supabaseAdmin
        .from("money_refunds")
        .select("id,order_item_id,paid,paid_at")
        .eq("closure_id", closure.id);
      if (refundsError) throw refundsError;

      const newVersion = expectedVersion + 1;
      const { data: claimedClosure, error: claimError } = await supabaseAdmin
        .from("money_closures")
        .update({ version: newVersion, updated_by: auth.user.id, updated_at: new Date().toISOString() })
        .eq("id", closure.id)
        .eq("version", expectedVersion)
        .select("id,version")
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimedClosure) {
        return NextResponse.json({ error: "Esta jornada cambió mientras la tenías abierta. Recarga antes de guardar.", conflict: true }, { status: 409 });
      }

      for (const refund of existingRefunds ?? []) {
        if (!refundState.has(String(refund.order_item_id))) continue;
        const paid = refundState.get(String(refund.order_item_id)) ?? false;
        const { error } = await supabaseAdmin
          .from("money_refunds")
          .update({
            paid,
            paid_at: paid ? refund.paid_at ?? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", refund.id);
        if (error) throw error;
      }

      await supabaseAdmin.from("money_closure_history").insert({
        closure_id: closure.id,
        version: newVersion,
        action: "refunds_updated",
        snapshot: { refunds: body.refunds ?? [] },
        changed_by: auth.user.id,
      });
      return NextResponse.json(await loadClosureDetail(cycleId, auth.user.id));
    }

    if (body.action === "reopen") {
      if (closure.status !== "closed") {
        return NextResponse.json({ error: "La jornada no está cerrada." }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from("money_closures")
        .update({ status: "draft", version: expectedVersion + 1, updated_by: auth.user.id, updated_at: new Date().toISOString() })
        .eq("id", closure.id)
        .eq("version", expectedVersion)
        .select("id,version")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "Esta jornada cambió mientras la tenías abierta.", conflict: true }, { status: 409 });
      await supabaseAdmin.from("money_closure_history").insert({
        closure_id: closure.id,
        version: expectedVersion + 1,
        action: "reopened",
        snapshot: { previousStatus: "closed", orderSnapshotHash: closure.order_snapshot_hash },
        changed_by: auth.user.id,
      });
      return NextResponse.json(await loadClosureDetail(cycleId, auth.user.id));
    }

    if (closure.status === "closed") {
      return NextResponse.json({ error: "La jornada está cerrada. Usa ‘Corregir cierre’ antes de editarla." }, { status: 409 });
    }

    const sourceByKey = new Map<string, MoneyProductSource>(
      source.products.map((product): [string, MoneyProductSource] => [product.itemKey, product])
    );
    const productInputs = body.products ?? [];
    const productInputByKey = new Map(productInputs.map((input) => [input.itemKey, input]));
    for (const input of productInputs) {
      const sourceProduct = sourceByKey.get(input.itemKey);
      if (!sourceProduct) continue;
      const values = [
        num(input.purchasedQuantity),
        num(input.purchaseTotal),
        num(input.usedQuantity),
        num(input.leftoverQuantity),
        num(input.lossQuantity),
      ];
      if (values.some((value) => value < 0)) {
        return NextResponse.json(
          { error: `Revisa las cantidades de ${sourceProduct.productName}.` },
          { status: 400 }
        );
      }
    }

    const unavailableKeys = new Set(
      productInputs.filter((input) => Boolean(input.unavailable)).map((input) => input.itemKey)
    );
    const refundState = new Map(
      (body.refunds ?? []).map((refund) => [cleanText(refund.orderItemId), Boolean(refund.paid)])
    );
    const [{ data: existingRefundRows, error: existingRefundError }, { data: productStateRows, error: productStateError }] =
      await Promise.all([
        supabaseAdmin.from("money_refunds").select("*").eq("closure_id", closure.id),
        supabaseAdmin
          .from("money_product_costs")
          .select("item_key,opening_stock_quantity,opening_stock_value")
          .eq("closure_id", closure.id),
      ]);
    if (existingRefundError) throw existingRefundError;
    if (productStateError) throw productStateError;
    const productStateByKey = new Map<
      string,
      { opening_stock_quantity: number | string | null; opening_stock_value: number | string | null }
    >(
      (productStateRows ?? []).map(
        (row): [string, { opening_stock_quantity: number | string | null; opening_stock_value: number | string | null }] => [
          String(row.item_key),
          row,
        ]
      )
    );
    for (const refund of existingRefundRows ?? []) {
      if (refund.paid && !unavailableKeys.has(String(refund.item_key))) {
        return NextResponse.json(
          { error: `No puedes quitar “No se consiguió” de ${refund.product_name_snapshot} porque ya hay un reembolso marcado como realizado.` },
          { status: 400 }
        );
      }
    }
    const desiredRefundCandidates = source.refundCandidates.filter((candidate) =>
      unavailableKeys.has(candidate.itemKey)
    );
    const desiredRefundTotal = desiredRefundCandidates.reduce((sum, candidate) => sum + candidate.amount, 0);

    const expenses = (body.expenses ?? [])
      .map((expense) => ({
        closure_id: closure.id,
        concept: cleanText(expense.concept),
        amount: Math.max(0, num(expense.amount)),
        notes: cleanText(expense.notes) || null,
      }))
      .filter((expense) => expense.concept && expense.amount >= 0);

    const labor = body.labor ?? {
      hourlyRate: 0,
      purchaseHours: 0,
      packingHours: 0,
      deliveryHours: 0,
    };
    if (
      [labor.hourlyRate, labor.purchaseHours, labor.packingHours, labor.deliveryHours].some(
        (value) => num(value) < 0
      )
    ) {
      return NextResponse.json(
        { error: "Las horas y la tarifa no pueden ser negativas." },
        { status: 400 }
      );
    }
    const laborTotal =
      num(labor.hourlyRate) *
      (num(labor.purchaseHours) + num(labor.packingHours) + num(labor.deliveryHours));
    const splits = (body.splits ?? [])
      .map((split) => ({
        closure_id: closure.id,
        person_name: cleanText(split.personName),
        percentage: round(Math.max(0, Math.min(100, num(split.percentage))), 4),
        paid: Boolean(split.paid),
        paid_at: split.paid ? new Date().toISOString() : null,
      }))
      .filter((split) => split.person_name);
    const splitTotal = splits.reduce((sum, split) => sum + num(split.percentage), 0);

    const vehicleInput = body.vehicle ?? {
      cenadaKm: 0,
      deliveryKm: 0,
      fuelPerKm: 0,
      maintenancePerKm: 0,
      fuelPaid: false,
    };
    const vehicleAuto = await getMoneyVehicleSuggestion(cycleId);
    let vehicle = { ...vehicleInput };
    if (vehicleAuto.ready) {
      vehicle = {
        cenadaKm: vehicleAuto.cenadaKm,
        deliveryKm: vehicleAuto.deliveryKm,
        fuelPerKm: vehicleAuto.fuelPerKm,
        maintenancePerKm: vehicleAuto.maintenancePerKm,
        fuelPaid: Boolean(vehicleInput.fuelPaid),
      };
    } else {
      const { data: savedVehicle, error: savedVehicleError } = await supabaseAdmin
        .from("money_vehicle")
        .select("cenada_km,delivery_km,fuel_per_km,maintenance_per_km,fuel_paid")
        .eq("closure_id", closure.id)
        .maybeSingle();
      if (savedVehicleError) throw savedVehicleError;
      if (savedVehicle) {
        vehicle = {
          cenadaKm: num(savedVehicle.cenada_km),
          deliveryKm: num(savedVehicle.delivery_km),
          fuelPerKm: num(savedVehicle.fuel_per_km),
          maintenancePerKm: num(savedVehicle.maintenance_per_km),
          fuelPaid: Boolean(vehicleInput.fuelPaid),
        };
      }
    }

    if (body.action === "close" && !vehicleAuto.ready) {
      return NextResponse.json(
        { error: vehicleAuto.error ?? "No se pudo calcular automáticamente el recorrido del jeep." },
        { status: 400 }
      );
    }

    if (body.action === "close") {
      const { data: openingRows, error: openingRowsError } = await supabaseAdmin
        .from("money_product_costs")
        .select("item_key,opening_stock_quantity")
        .eq("closure_id", closure.id);
      if (openingRowsError) throw openingRowsError;
      const openingByKey = new Map<string, number>(
        (openingRows ?? []).map(
          (row): [string, number] => [String(row.item_key), num(row.opening_stock_quantity)]
        )
      );
      for (const sourceProduct of source.products) {
        const input = productInputByKey.get(sourceProduct.itemKey);
        if (input?.unavailable) continue;
        const purchased = input?.purchasedQuantity ?? null;
        const purchaseTotal = input?.purchaseTotal ?? null;
        if (purchased === null || purchaseTotal === null || num(purchased) < 0) {
          return NextResponse.json(
            { error: `Falta registrar la compra real de ${sourceProduct.productName}. Si no compraste más porque había sobrante, escribe 0 y ₡0.` },
            { status: 400 }
          );
        }
        const available = (openingByKey.get(sourceProduct.itemKey) ?? 0) + num(purchased);
        if (available <= 0) {
          return NextResponse.json(
            { error: `No hay cantidad disponible registrada para ${sourceProduct.productName}.` },
            { status: 400 }
          );
        }
        const accounted =
          num(input?.usedQuantity) + num(input?.leftoverQuantity) + num(input?.lossQuantity);
        if (Math.abs(available - accounted) > 0.011) {
          return NextResponse.json(
            { error: `Las cantidades de ${sourceProduct.productName} no cuadran.` },
            { status: 400 }
          );
        }
      }
      if (laborTotal > 0 && Math.abs(splitTotal - 100) > 0.01) {
        return NextResponse.json(
          { error: "El reparto del trabajo debe sumar 100%." },
          { status: 400 }
        );
      }
      const nonDeliveredCount = (
        (source.snapshot.orders as Array<{ status?: string }>) ?? []
      ).filter((order) => order.status !== "delivered").length;
      if (nonDeliveredCount > 0) {
        return NextResponse.json(
          {
            error:
              "Todavía hay pedidos pagados sin marcar como entregados. Finaliza las entregas antes de cerrar.",
          },
          { status: 400 }
        );
      }
    }

    const usageInputs = body.materialUsages ?? [];
    const preparedMaterialUsages: Array<
      | { action: "delete"; id: string }
      | {
          action: "upsert";
          payload: {
            closure_id: string;
            material_id: string;
            quantity: number;
            unit_cost_snapshot: number;
            total_cost_snapshot: number;
            updated_at: string;
          };
        }
    > = [];
    for (const usage of usageInputs) {
      const quantity = Math.max(0, num(usage.quantity));
      const { data: existingUsage, error: existingUsageError } = await supabaseAdmin
        .from("money_material_usage")
        .select("id,quantity,total_cost_snapshot")
        .eq("closure_id", closure.id)
        .eq("material_id", usage.materialId)
        .maybeSingle();
      if (existingUsageError) throw existingUsageError;
      if (quantity === 0) {
        if (existingUsage?.id) preparedMaterialUsages.push({ action: "delete", id: existingUsage.id });
        continue;
      }
      const [purchasesResult, usagesResult] = await Promise.all([
        supabaseAdmin
          .from("money_material_purchases")
          .select("quantity,total_cost")
          .eq("material_id", usage.materialId),
        supabaseAdmin
          .from("money_material_usage")
          .select("id,quantity,total_cost_snapshot")
          .eq("material_id", usage.materialId),
      ]);
      if (purchasesResult.error) throw purchasesResult.error;
      if (usagesResult.error) throw usagesResult.error;
      const purchasedQty = (purchasesResult.data ?? []).reduce(
        (sum, row) => sum + num(row.quantity),
        0
      );
      const purchasedValue = (purchasesResult.data ?? []).reduce(
        (sum, row) => sum + num(row.total_cost),
        0
      );
      const otherUsages = (usagesResult.data ?? []).filter(
        (row) => row.id !== existingUsage?.id
      );
      const usedQty = otherUsages.reduce((sum, row) => sum + num(row.quantity), 0);
      const usedValue = otherUsages.reduce(
        (sum, row) => sum + num(row.total_cost_snapshot),
        0
      );
      const availableQty = purchasedQty - usedQty;
      const availableValue = purchasedValue - usedValue;
      if (quantity > availableQty + 0.001) {
        return NextResponse.json(
          { error: "No hay suficiente material disponible para registrar ese consumo." },
          { status: 400 }
        );
      }
      const unitCost = availableQty > 0 ? availableValue / availableQty : 0;
      preparedMaterialUsages.push({
        action: "upsert",
        payload: {
          closure_id: closure.id,
          material_id: usage.materialId,
          quantity,
          unit_cost_snapshot: round(unitCost, 6),
          total_cost_snapshot: round(quantity * unitCost),
          updated_at: new Date().toISOString(),
        },
      });
    }

    // Reclama primero esta versión del cierre. Así dos administradores no pueden
    // guardar simultáneamente sobre la misma versión sin enterarse.
    const newVersion = expectedVersion + 1;
    const { data: claimedClosure, error: claimError } = await supabaseAdmin
      .from("money_closures")
      .update({
        notes: cleanText(body.notes) || null,
        version: newVersion,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", closure.id)
      .eq("version", expectedVersion)
      .select("id,version")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimedClosure) {
      return NextResponse.json(
        {
          error: "Esta jornada cambió mientras la tenías abierta. Recarga antes de guardar.",
          conflict: true,
        },
        { status: 409 }
      );
    }

    for (const input of productInputs) {
      if (!sourceByKey.has(input.itemKey)) continue;
      const state = productStateByKey.get(input.itemKey);
      const unavailable = Boolean(input.unavailable);
      const { error } = await supabaseAdmin
        .from("money_product_costs")
        .update({
          unavailable,
          purchased_quantity: unavailable ? 0 : input.purchasedQuantity,
          purchase_total: unavailable ? 0 : input.purchaseTotal,
          used_quantity: unavailable ? 0 : input.usedQuantity,
          leftover_quantity: unavailable ? num(state?.opening_stock_quantity) : input.leftoverQuantity,
          loss_quantity: unavailable ? 0 : input.lossQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("closure_id", closure.id)
        .eq("item_key", input.itemKey);
      if (error) throw error;
    }

    const desiredOrderItemIds = new Set(desiredRefundCandidates.map((candidate) => candidate.orderItemId));
    for (const existingRefund of existingRefundRows ?? []) {
      if (desiredOrderItemIds.has(String(existingRefund.order_item_id))) continue;
      const { error } = await supabaseAdmin
        .from("money_refunds")
        .delete()
        .eq("id", existingRefund.id);
      if (error) throw error;
    }
    const existingRefundByItem = new Map<
      string,
      { paid: boolean; paid_at: string | null }
    >(
      (existingRefundRows ?? []).map(
        (row): [string, { paid: boolean; paid_at: string | null }] => [
          String(row.order_item_id),
          { paid: Boolean(row.paid), paid_at: row.paid_at ?? null },
        ]
      )
    );
    for (const candidate of desiredRefundCandidates) {
      const existingRefund = existingRefundByItem.get(candidate.orderItemId);
      const requestedPaid = refundState.has(candidate.orderItemId)
        ? refundState.get(candidate.orderItemId) ?? false
        : Boolean(existingRefund?.paid);
      const { error } = await supabaseAdmin.from("money_refunds").upsert(
        {
          closure_id: closure.id,
          order_id: candidate.orderId,
          order_item_id: candidate.orderItemId,
          item_key: candidate.itemKey,
          product_name_snapshot: candidate.productName,
          customer_name_snapshot: candidate.customerName,
          customer_phone_snapshot: candidate.customerPhone || null,
          quantity: candidate.quantity,
          unit_snapshot: candidate.unit,
          unit_price_snapshot: candidate.unitPrice,
          amount: candidate.amount,
          paid: requestedPaid,
          paid_at: requestedPaid ? existingRefund?.paid_at ?? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "closure_id,order_item_id" }
      );
      if (error) throw error;
    }

    const deleteExpenseResult = await supabaseAdmin
      .from("money_expenses")
      .delete()
      .eq("closure_id", closure.id);
    if (deleteExpenseResult.error) throw deleteExpenseResult.error;
    if (expenses.length) {
      const { error } = await supabaseAdmin.from("money_expenses").insert(expenses);
      if (error) throw error;
    }

    const { error: laborError } = await supabaseAdmin.from("money_labor").upsert(
      {
        closure_id: closure.id,
        hourly_rate: num(labor.hourlyRate),
        purchase_hours: num(labor.purchaseHours),
        packing_hours: num(labor.packingHours),
        delivery_hours: num(labor.deliveryHours),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "closure_id" }
    );
    if (laborError) throw laborError;

    const deleteSplitsResult = await supabaseAdmin
      .from("money_labor_splits")
      .delete()
      .eq("closure_id", closure.id);
    if (deleteSplitsResult.error) throw deleteSplitsResult.error;
    if (splits.length) {
      const { error } = await supabaseAdmin.from("money_labor_splits").insert(splits);
      if (error) throw error;
    }

    const { error: vehicleError } = await supabaseAdmin.from("money_vehicle").upsert(
      {
        closure_id: closure.id,
        cenada_km: num(vehicle.cenadaKm),
        delivery_km: num(vehicle.deliveryKm),
        fuel_per_km: num(vehicle.fuelPerKm),
        maintenance_per_km: num(vehicle.maintenancePerKm),
        fuel_paid: Boolean(vehicle.fuelPaid),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "closure_id" }
    );
    if (vehicleError) throw vehicleError;

    for (const prepared of preparedMaterialUsages) {
      if (prepared.action === "delete") {
        const { error } = await supabaseAdmin
          .from("money_material_usage")
          .delete()
          .eq("id", prepared.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from("money_material_usage")
          .upsert(prepared.payload, { onConflict: "closure_id,material_id" });
        if (error) throw error;
      }
    }

    if (body.action === "close") {
      const { error: closeError } = await supabaseAdmin
        .from("money_closures")
        .update({
          status: "closed",
          product_revenue_snapshot: source.productRevenue,
          shipping_revenue_snapshot: source.shippingRevenue,
          total_revenue_snapshot: source.totalRevenue,
          refund_total_snapshot: round(desiredRefundTotal),
          order_snapshot: source.snapshot,
          order_snapshot_hash: source.snapshotHash,
          closed_at: new Date().toISOString(),
          closed_by: auth.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", closure.id)
        .eq("version", newVersion);
      if (closeError) throw closeError;
    }

    const refreshed = await loadClosureDetail(cycleId, auth.user.id);

    await supabaseAdmin.from("money_closure_history").insert({
      closure_id: closure.id,
      version: newVersion,
      action: body.action === "close" ? "closed" : "saved",
      snapshot: {
        sourceHash: source.snapshotHash,
        notes: cleanText(body.notes) || null,
        totals: refreshed.totals,
        products: body.products ?? [],
        expenses,
        labor,
        splits,
        vehicle,
        refunds: desiredRefundCandidates.map((candidate) => ({
          orderItemId: candidate.orderItemId,
          amount: candidate.amount,
          paid: refundState.get(candidate.orderItemId) ?? false,
        })),
        materialUsages: usageInputs,
      },
      changed_by: auth.user.id,
    });

    return NextResponse.json(refreshed);
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: "Falta aplicar la migración de Dinero. Ejecuta APLICAR_CONTROL_DINERO_20261016.sql y APLICAR_JEEP_REEMBOLSOS_20261016.sql en Supabase." }, { status: 409 });
    }
    console.error("ERROR GUARDAR CIERRE:", error);
    return NextResponse.json({ error: "No se pudo guardar la jornada" }, { status: 500 });
  }
}
