import { createHash } from "crypto";
import { getAdminAppSettings } from "@/lib/appSettings.server";
import {
  getOpenRouteServiceRoundTrip,
  isOpenRouteServiceConfigured,
  optimizeOpenRouteServiceDeliveries,
} from "@/lib/routing/openRouteService.server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const PAID_ORDER_STATUSES = new Set([
  "confirmed",
  "preparing",
  "ready",
  "delivered",
]);

export type MoneyProductSource = {
  itemKey: string;
  productId: number | null;
  productName: string;
  unit: string | null;
  maturityPreference: string | null;
  neededQuantity: number;
  cenadaReferencePrice: number | null;
  cenadaReferenceDate: string | null;
};

export type MoneyRefundCandidate = {
  orderId: string;
  orderItemId: string;
  itemKey: string;
  productName: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  amount: number;
  customerName: string;
  customerPhone: string;
};

export type MoneyCycleSource = {
  cycleId: string;
  deliveryDate: string;
  productRevenue: number;
  shippingRevenue: number;
  totalRevenue: number;
  orderCount: number;
  pendingPaymentCount: number;
  products: MoneyProductSource[];
  refundCandidates: MoneyRefundCandidate[];
  snapshot: Record<string, unknown>;
  snapshotHash: string;
};

export type MoneyVehicleSuggestion = {
  ready: boolean;
  error: string | null;
  vehicleName: string | null;
  cenadaRoadKm: number;
  cenadaInternalKm: number;
  cenadaKm: number;
  deliveryKm: number;
  totalKm: number;
  fuelPerKm: number;
  maintenancePerKm: number;
  fuelCost: number;
  maintenanceCost: number;
  deliveryStops: number;
  missingLocationCount: number;
};

type RawOrderItem = {
  id: string;
  product_id: number | null;
  product_name: string;
  price: number | string | null;
  quantity: number | string | null;
  maturity_preference: string | null;
  unit: string | null;
};

type RawOrder = {
  id: string;
  guest_name: string | null;
  guest_phone: string | null;
  subtotal: number | string | null;
  shipping: number | string | null;
  total: number | string | null;
  status: string;
  created_at: string;
  delivery_cycle_id: string | null;
  order_item: RawOrderItem[] | null;
};

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeUnit(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildMoneyItemKey(input: {
  productId: number | null;
  productName: string;
  unit: string | null;
  maturityPreference: string | null;
}) {
  return [
    input.productId ?? input.productName.trim().toLowerCase(),
    input.unit?.toLowerCase() ?? "none",
    input.maturityPreference?.trim().toLowerCase() || "none",
  ].join("::");
}

export async function getMoneyCycleSource(cycleId: string): Promise<MoneyCycleSource> {
  const { data: cycle, error: cycleError } = await supabaseAdmin
    .from("delivery_cycles")
    .select("id,delivery_date")
    .eq("id", cycleId)
    .single();

  if (cycleError) throw cycleError;

  const { data: orderRows, error: orderError } = await supabaseAdmin
    .from("orders")
    .select(`
      id,
      guest_name,
      guest_phone,
      subtotal,
      shipping,
      total,
      status,
      created_at,
      delivery_cycle_id,
      order_item(
        id,
        product_id,
        product_name,
        price,
        quantity,
        maturity_preference,
        unit
      )
    `)
    .eq("delivery_cycle_id", cycleId)
    .order("created_at", { ascending: true });

  if (orderError) throw orderError;

  const orders = (orderRows ?? []) as RawOrder[];
  const paidOrders = orders.filter((order) => PAID_ORDER_STATUSES.has(order.status));
  const pendingPaymentCount = orders.filter(
    (order) => order.status === "pending" || order.status === "pending_payment"
  ).length;

  const productIds = Array.from(
    new Set(
      paidOrders.flatMap((order) =>
        (order.order_item ?? [])
          .map((item) => item.product_id)
          .filter((id): id is number => typeof id === "number")
      )
    )
  );

  const [{ data: productRows, error: productError }, { data: pricingRun, error: pricingRunError }] =
    await Promise.all([
      productIds.length
        ? supabaseAdmin.from("products").select("id,unit").in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from("pricing_runs")
        .select("id")
        .eq("status", "completed")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (productError) throw productError;
  if (pricingRunError) throw pricingRunError;

  const productUnitById = new Map<number, string | null>(
    (productRows ?? []).map((row) => [Number(row.id), normalizeUnit(row.unit)])
  );

  let recommendationRows: Array<{
    product_id: number;
    cenada_price: number | string | null;
    cenada_source_date: string | null;
  }> = [];

  if (productIds.length && pricingRun?.id) {
    const { data, error } = await supabaseAdmin
      .from("price_recommendations")
      .select("product_id,cenada_price,cenada_source_date")
      .eq("run_id", pricingRun.id)
      .in("product_id", productIds);

    if (error) throw error;
    recommendationRows = data ?? [];
  }

  const cenadaByProduct = new Map(
    recommendationRows.map((row) => [
      Number(row.product_id),
      {
        price: row.cenada_price === null ? null : toNumber(row.cenada_price),
        date: row.cenada_source_date ?? null,
      },
    ])
  );

  const productMap = new Map<string, MoneyProductSource>();
  let productRevenue = 0;
  let shippingRevenue = 0;
  let totalRevenue = 0;

  for (const order of paidOrders) {
    shippingRevenue += toNumber(order.shipping);
    totalRevenue += toNumber(order.total);

    for (const item of order.order_item ?? []) {
      const quantity = toNumber(item.quantity);
      productRevenue += toNumber(item.price) * quantity;
      const unit = normalizeUnit(item.unit) ??
        (item.product_id === null ? null : productUnitById.get(Number(item.product_id)) ?? null);
      const maturityPreference = item.maturity_preference?.trim() || null;
      const itemKey = buildMoneyItemKey({
        productId: item.product_id,
        productName: item.product_name,
        unit,
        maturityPreference,
      });
      const current = productMap.get(itemKey);
      const baseProductUnit = item.product_id === null
        ? null
        : productUnitById.get(Number(item.product_id)) ?? null;
      const sameUnitAsCatalog = !unit || !baseProductUnit ||
        unit.toLowerCase() === baseProductUnit.toLowerCase();
      const cenada = item.product_id === null || !sameUnitAsCatalog
        ? null
        : cenadaByProduct.get(Number(item.product_id)) ?? null;

      productMap.set(itemKey, {
        itemKey,
        productId: item.product_id,
        productName: item.product_name,
        unit,
        maturityPreference,
        neededQuantity: round((current?.neededQuantity ?? 0) + quantity, 3),
        cenadaReferencePrice: current?.cenadaReferencePrice ?? cenada?.price ?? null,
        cenadaReferenceDate: current?.cenadaReferenceDate ?? cenada?.date ?? null,
      });
    }
  }

  const refundCandidates: MoneyRefundCandidate[] = paidOrders.flatMap((order) =>
    (order.order_item ?? []).map((item) => {
      const unit = normalizeUnit(item.unit) ??
        (item.product_id === null ? null : productUnitById.get(Number(item.product_id)) ?? null);
      const maturityPreference = item.maturity_preference?.trim() || null;
      const quantity = toNumber(item.quantity);
      const unitPrice = toNumber(item.price);
      return {
        orderId: order.id,
        orderItemId: item.id,
        itemKey: buildMoneyItemKey({
          productId: item.product_id,
          productName: item.product_name,
          unit,
          maturityPreference,
        }),
        productName: item.product_name,
        quantity: round(quantity, 3),
        unit,
        unitPrice: round(unitPrice),
        amount: round(unitPrice * quantity),
        customerName: order.guest_name?.trim() || "Cliente",
        customerPhone: order.guest_phone?.trim() || "",
      };
    })
  );

  const snapshot = {
    cycleId,
    deliveryDate: cycle.delivery_date,
    orders: paidOrders.map((order) => ({
      id: order.id,
      status: order.status,
      subtotal: toNumber(order.subtotal),
      shipping: toNumber(order.shipping),
      total: toNumber(order.total),
      items: (order.order_item ?? []).map((item) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        price: toNumber(item.price),
        quantity: toNumber(item.quantity),
        unit: normalizeUnit(item.unit),
        maturityPreference: item.maturity_preference ?? null,
      })),
    })),
  };

  return {
    cycleId,
    deliveryDate: cycle.delivery_date,
    productRevenue: round(productRevenue),
    shippingRevenue: round(shippingRevenue),
    totalRevenue: round(totalRevenue),
    orderCount: paidOrders.length,
    pendingPaymentCount,
    products: [...productMap.values()].sort((a, b) =>
      a.productName.localeCompare(b.productName, "es")
    ),
    refundCandidates,
    snapshot,
    snapshotHash: stableHash(snapshot),
  };
}

export async function getMoneyVehicleSuggestion(cycleId: string): Promise<MoneyVehicleSuggestion> {
  const empty = (error: string | null): MoneyVehicleSuggestion => ({
    ready: false,
    error,
    vehicleName: null,
    cenadaRoadKm: 0,
    cenadaInternalKm: 0,
    cenadaKm: 0,
    deliveryKm: 0,
    totalKm: 0,
    fuelPerKm: 0,
    maintenancePerKm: 0,
    fuelCost: 0,
    maintenanceCost: 0,
    deliveryStops: 0,
    missingLocationCount: 0,
  });

  try {
    const settings = await getAdminAppSettings();
    const distance = settings.deliveryDistance;
    const vehicle = distance.vehicles.find((item) => item.active) ?? null;
    const fuelPrice = vehicle ? distance.fuelPricesCrcPerLiter[vehicle.fuelType] : null;
    if (
      distance.originLatitude === null || distance.originLongitude === null ||
      distance.cenadaLatitude === null || distance.cenadaLongitude === null ||
      !vehicle || vehicle.consumptionLPer100Km === null ||
      vehicle.maintenanceCrcPerKm === null || fuelPrice === null || fuelPrice <= 0
    ) {
      return empty("Completa el punto de salida y los datos del jeep en Configuración → Entregas.");
    }
    if (!isOpenRouteServiceConfigured()) {
      return empty("OpenRouteService no está configurado en el servidor.");
    }

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id,status,latitude,longitude")
      .eq("delivery_cycle_id", cycleId);
    if (error) throw error;

    const paidOrders = (orders ?? []).filter((order) => PAID_ORDER_STATUSES.has(String(order.status)));
    const validStops = paidOrders.flatMap((order) => {
      const latitude = Number(order.latitude);
      const longitude = Number(order.longitude);
      if (
        !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
        (latitude === 0 && longitude === 0)
      ) return [];
      return [{ orderId: String(order.id), latitude, longitude }];
    });

    const missingLocationCount = Math.max(0, paidOrders.length - validStops.length);
    if (missingLocationCount > 0) {
      const result = empty(`${missingLocationCount} pedido(s) pagado(s) no tienen una ubicación válida. Corrige su ubicación antes de cerrar la jornada.`);
      result.vehicleName = vehicle.name;
      result.missingLocationCount = missingLocationCount;
      result.deliveryStops = validStops.length;
      return result;
    }

    const origin = { latitude: distance.originLatitude, longitude: distance.originLongitude };
    const [cenadaRoute, deliveryRoute] = await Promise.all([
      getOpenRouteServiceRoundTrip(origin, {
        latitude: distance.cenadaLatitude,
        longitude: distance.cenadaLongitude,
      }),
      optimizeOpenRouteServiceDeliveries({
        origin,
        stops: validStops,
        serviceMinutesPerStop: 0,
      }),
    ]);

    const cenadaRoadKm = round(cenadaRoute.roundTripDistanceKm);
    const cenadaInternalKm = round(distance.cenadaInternalKm);
    const cenadaKm = round(cenadaRoadKm + cenadaInternalKm);
    const deliveryKm = round(deliveryRoute.distanceKm);
    const totalKm = round(cenadaKm + deliveryKm);
    const fuelPerKm = round((vehicle.consumptionLPer100Km / 100) * fuelPrice, 4);
    const maintenancePerKm = round(vehicle.maintenanceCrcPerKm, 4);

    return {
      ready: true,
      error: null,
      vehicleName: vehicle.name,
      cenadaRoadKm,
      cenadaInternalKm,
      cenadaKm,
      deliveryKm,
      totalKm,
      fuelPerKm,
      maintenancePerKm,
      fuelCost: round(totalKm * fuelPerKm),
      maintenanceCost: round(totalKm * maintenancePerKm),
      deliveryStops: validStops.length,
      missingLocationCount,
    };
  } catch (error) {
    return empty(error instanceof Error ? error.message : "No se pudo calcular el recorrido del jeep.");
  }
}

export function calculateProductAccounting(row: {
  opening_stock_quantity?: number | string | null;
  opening_stock_value?: number | string | null;
  purchased_quantity: number | string | null;
  purchase_total: number | string | null;
  used_quantity: number | string | null;
  leftover_quantity: number | string | null;
  loss_quantity: number | string | null;
}) {
  const openingQuantity = toNumber(row.opening_stock_quantity);
  const openingValue = toNumber(row.opening_stock_value);
  const purchased = toNumber(row.purchased_quantity);
  const purchaseTotal = toNumber(row.purchase_total);
  const used = toNumber(row.used_quantity);
  const leftover = toNumber(row.leftover_quantity);
  const loss = toNumber(row.loss_quantity);
  const hasPurchaseQuantity = row.purchased_quantity !== null && row.purchased_quantity !== undefined;
  const hasPurchaseTotal = row.purchase_total !== null && row.purchase_total !== undefined;
  const availableQuantity = openingQuantity + purchased;
  const availableValue = openingValue + purchaseTotal;
  const unitCost =
    hasPurchaseQuantity && hasPurchaseTotal && availableQuantity > 0
      ? availableValue / availableQuantity
      : null;
  return {
    openingQuantity,
    openingValue,
    purchased,
    purchaseTotal,
    availableQuantity,
    availableValue,
    used,
    leftover,
    loss,
    unitCost,
    usedCost: unitCost === null ? null : round(used * unitCost),
    lossCost: unitCost === null ? null : round(loss * unitCost),
    leftoverValue: unitCost === null ? null : round(leftover * unitCost),
    reconciles:
      availableQuantity > 0 &&
      Math.abs(availableQuantity - used - leftover - loss) <= 0.011,
    complete:
      hasPurchaseQuantity &&
      hasPurchaseTotal &&
      purchased >= 0 &&
      purchaseTotal >= 0 &&
      availableQuantity > 0 &&
      unitCost !== null,
  };
}

export function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    candidate.message?.includes("does not exist") === true ||
    candidate.message?.includes("Could not find the table") === true
  );
}
