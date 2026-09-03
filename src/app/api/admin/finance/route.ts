import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FINANCIAL_STATUSES = [
  "confirmed",
  "preparing",
  "ready",
  "delivered",
];

const PERIOD_OPTIONS: Record<string, number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  all: null,
};

type ProductRow = {
  id: number;
  name: string;
  category: string | null;
  unit: string | null;
  price: number | string | null;
};

type RecommendationRow = {
  product_id: number;
  effective_cost: number | string | null;
};

type OrderItemRow = {
  product_id: number | null;
  product_name: string;
  price: number | string;
  quantity: number | string;
};

type OrderRow = {
  id: string;
  total: number | string;
  shipping: number | string | null;
  status: string;
  created_at: string;
  delivery_cycle_id: string | null;
  order_item: OrderItemRow[] | null;
};

type DeliveryCycleRow = {
  id: string;
  delivery_date: string;
};

type PricingRuleRow = {
  category: string | null;
  minimum_margin: number | string;
  competitive_minimum_margin: number | string;
  walmart_discount: number | string;
};

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.round(value * 10000) / 10000;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const requestedPeriod = url.searchParams.get("days") ?? "30";
    const periodKey = Object.prototype.hasOwnProperty.call(
      PERIOD_OPTIONS,
      requestedPeriod
    )
      ? requestedPeriod
      : "30";
    const days = PERIOD_OPTIONS[periodKey];

    let ordersQuery = supabaseAdmin
      .from("orders")
      .select(`
        id,
        total,
        shipping,
        status,
        created_at,
        delivery_cycle_id,
        order_item(
          product_id,
          product_name,
          price,
          quantity
        )
      `)
      .in("status", FINANCIAL_STATUSES)
      .order("created_at", { ascending: false });

    if (days !== null) {
      const from = new Date();
      from.setUTCDate(from.getUTCDate() - days);
      ordersQuery = ordersQuery.gte("created_at", from.toISOString());
    }

    const [ordersResult, productsResult, rulesResult, cyclesResult, publishedRunResult] =
      await Promise.all([
        ordersQuery,
        supabaseAdmin
          .from("products")
          .select("id,name,category,unit,price")
          .eq("is_active", true)
          .order("name"),
        supabaseAdmin
          .from("pricing_rules")
          .select(
            "category,minimum_margin,competitive_minimum_margin,walmart_discount"
          )
          .eq("enabled", true)
          .order("category"),
        supabaseAdmin
          .from("delivery_cycles")
          .select("id,delivery_date")
          .order("delivery_date", { ascending: false })
          .limit(40),
        supabaseAdmin
          .from("pricing_runs")
          .select("id,cycle_id,status,published_at,finished_at")
          .eq("status", "completed")
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (ordersResult.error) throw ordersResult.error;
    if (productsResult.error) throw productsResult.error;
    if (rulesResult.error) throw rulesResult.error;
    if (cyclesResult.error) throw cyclesResult.error;
    if (publishedRunResult.error) throw publishedRunResult.error;

    let pricingRun = publishedRunResult.data;

    if (!pricingRun) {
      const latestRunResult = await supabaseAdmin
        .from("pricing_runs")
        .select("id,cycle_id,status,published_at,finished_at")
        .eq("status", "completed")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRunResult.error) throw latestRunResult.error;
      pricingRun = latestRunResult.data;
    }

    let recommendations: RecommendationRow[] = [];

    if (pricingRun) {
      const recommendationsResult = await supabaseAdmin
        .from("price_recommendations")
        .select("product_id,effective_cost")
        .eq("run_id", pricingRun.id);

      if (recommendationsResult.error) throw recommendationsResult.error;
      recommendations = (recommendationsResult.data ?? []) as RecommendationRow[];
    }

    const orders = (ordersResult.data ?? []) as OrderRow[];
    const products = (productsResult.data ?? []) as ProductRow[];
    const rules = (rulesResult.data ?? []) as PricingRuleRow[];
    const cycles = (cyclesResult.data ?? []) as DeliveryCycleRow[];

    const productById = new Map(products.map((product) => [Number(product.id), product]));
    const effectiveCostByProduct = new Map<number, number>();

    for (const recommendation of recommendations) {
      const cost = toNumber(recommendation.effective_cost);
      if (cost > 0) {
        effectiveCostByProduct.set(Number(recommendation.product_id), cost);
      }
    }

    const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle.delivery_date]));

    let totalSales = 0;
    let shippingRevenue = 0;
    let merchandiseRevenue = 0;
    let coveredMerchandiseRevenue = 0;
    let estimatedMerchandiseCost = 0;

    const categoryMap = new Map<
      string,
      {
        revenue: number;
        coveredRevenue: number;
        cost: number;
        units: number;
      }
    >();

    const cycleMap = new Map<
      string,
      {
        cycleId: string;
        deliveryDate: string | null;
        orders: number;
        sales: number;
        productRevenue: number;
        coveredRevenue: number;
        cost: number;
      }
    >();

    for (const order of orders) {
      const orderTotal = toNumber(order.total);
      const orderShipping = toNumber(order.shipping);

      totalSales += orderTotal;
      shippingRevenue += orderShipping;

      if (order.delivery_cycle_id) {
        const currentCycle = cycleMap.get(order.delivery_cycle_id) ?? {
          cycleId: order.delivery_cycle_id,
          deliveryDate: cycleById.get(order.delivery_cycle_id) ?? null,
          orders: 0,
          sales: 0,
          productRevenue: 0,
          coveredRevenue: 0,
          cost: 0,
        };

        currentCycle.orders += 1;
        currentCycle.sales += orderTotal;
        cycleMap.set(order.delivery_cycle_id, currentCycle);
      }

      for (const item of order.order_item ?? []) {
        const quantity = toNumber(item.quantity);
        const lineRevenue = toNumber(item.price) * quantity;
        const productId = item.product_id === null ? null : Number(item.product_id);
        const product = productId === null ? null : productById.get(productId) ?? null;
        const category = product?.category?.trim() || "Sin categoría";
        const effectiveCost =
          productId === null ? null : effectiveCostByProduct.get(productId) ?? null;

        merchandiseRevenue += lineRevenue;

        const categoryRow = categoryMap.get(category) ?? {
          revenue: 0,
          coveredRevenue: 0,
          cost: 0,
          units: 0,
        };
        categoryRow.revenue += lineRevenue;
        categoryRow.units += quantity;

        if (effectiveCost !== null) {
          const lineCost = effectiveCost * quantity;
          coveredMerchandiseRevenue += lineRevenue;
          estimatedMerchandiseCost += lineCost;
          categoryRow.coveredRevenue += lineRevenue;
          categoryRow.cost += lineCost;

          if (order.delivery_cycle_id) {
            const cycleRow = cycleMap.get(order.delivery_cycle_id);
            if (cycleRow) {
              cycleRow.coveredRevenue += lineRevenue;
              cycleRow.cost += lineCost;
            }
          }
        }

        if (order.delivery_cycle_id) {
          const cycleRow = cycleMap.get(order.delivery_cycle_id);
          if (cycleRow) {
            cycleRow.productRevenue += lineRevenue;
          }
        }

        categoryMap.set(category, categoryRow);
      }
    }

    const estimatedGrossProfit =
      coveredMerchandiseRevenue - estimatedMerchandiseCost;
    const weightedSalesMargin =
      coveredMerchandiseRevenue > 0
        ? estimatedGrossProfit / coveredMerchandiseRevenue
        : null;
    const salesCostCoverage =
      merchandiseRevenue > 0
        ? coveredMerchandiseRevenue / merchandiseRevenue
        : null;

    const catalogMargins: Array<{
      productId: number;
      name: string;
      category: string;
      unit: string | null;
      price: number;
      effectiveCost: number;
      margin: number;
    }> = [];

    for (const product of products) {
      const price = toNumber(product.price);
      const effectiveCost = effectiveCostByProduct.get(Number(product.id)) ?? null;

      if (price <= 0 || effectiveCost === null) continue;

      catalogMargins.push({
        productId: Number(product.id),
        name: product.name,
        category: product.category?.trim() || "Sin categoría",
        unit: product.unit,
        price,
        effectiveCost,
        margin: (price - effectiveCost) / price,
      });
    }

    const catalogMarginValues = catalogMargins.map((item) => item.margin);
    const catalogAverageMargin =
      catalogMarginValues.length > 0
        ? catalogMarginValues.reduce((sum, value) => sum + value, 0) /
          catalogMarginValues.length
        : null;
    const catalogMedianMargin = median(catalogMarginValues);

    const standardFloor = 0.3;
    const competitiveFloor = 0.2;

    const categoryBreakdown = [...categoryMap.entries()]
      .map(([category, values]) => {
        const profit = values.coveredRevenue - values.cost;
        return {
          category,
          revenue: roundMoney(values.revenue),
          estimatedGrossProfit: roundMoney(profit),
          estimatedMargin:
            values.coveredRevenue > 0
              ? roundRatio(profit / values.coveredRevenue)
              : null,
          costCoverage:
            values.revenue > 0
              ? roundRatio(values.coveredRevenue / values.revenue)
              : null,
          units: roundMoney(values.units),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const cycleBreakdown = [...cycleMap.values()]
      .sort((a, b) => {
        const dateA = a.deliveryDate ?? "";
        const dateB = b.deliveryDate ?? "";
        return dateB.localeCompare(dateA);
      })
      .slice(0, 8)
      .map((cycle) => {
        const profit = cycle.coveredRevenue - cycle.cost;
        return {
          cycleId: cycle.cycleId,
          deliveryDate: cycle.deliveryDate,
          orders: cycle.orders,
          sales: roundMoney(cycle.sales),
          productRevenue: roundMoney(cycle.productRevenue),
          estimatedGrossProfit: roundMoney(profit),
          estimatedMargin:
            cycle.coveredRevenue > 0
              ? roundRatio(profit / cycle.coveredRevenue)
              : null,
          costCoverage:
            cycle.productRevenue > 0
              ? roundRatio(cycle.coveredRevenue / cycle.productRevenue)
              : null,
        };
      });

    const lowMarginProducts = [...catalogMargins]
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 12)
      .map((item) => ({
        ...item,
        price: roundMoney(item.price),
        effectiveCost: roundMoney(item.effectiveCost),
        margin: roundRatio(item.margin),
      }));

    const normalizedRules = rules.map((rule) => ({
      category: rule.category?.trim() || "Regla general",
      minimumMargin: roundRatio(toNumber(rule.minimum_margin)),
      competitiveMinimumMargin: roundRatio(
        toNumber(rule.competitive_minimum_margin)
      ),
      walmartDiscount: roundRatio(Math.min(toNumber(rule.walmart_discount), 0.10)),
    }));

    return NextResponse.json(
      {
        period: {
          key: periodKey,
          days,
        },
        pricingSnapshot: pricingRun
          ? {
              runId: Number(pricingRun.id),
              cycleId:
                pricingRun.cycle_id === null
                  ? null
                  : Number(pricingRun.cycle_id),
              publishedAt: pricingRun.published_at,
              finishedAt: pricingRun.finished_at,
              isPublished: Boolean(pricingRun.published_at),
            }
          : null,
        summary: {
          paidOrders: orders.length,
          totalSales: roundMoney(totalSales),
          merchandiseRevenue: roundMoney(merchandiseRevenue),
          shippingRevenue: roundMoney(shippingRevenue),
          averageTicket:
            orders.length > 0 ? roundMoney(totalSales / orders.length) : 0,
          estimatedMerchandiseCost: roundMoney(estimatedMerchandiseCost),
          estimatedGrossProfit: roundMoney(estimatedGrossProfit),
          weightedSalesMargin: roundRatio(weightedSalesMargin),
          salesCostCoverage: roundRatio(salesCostCoverage),
          catalogAverageMargin: roundRatio(catalogAverageMargin),
          catalogMedianMargin: roundRatio(catalogMedianMargin),
          activeProducts: products.length,
          productsWithCost: catalogMargins.length,
          catalogCostCoverage:
            products.length > 0
              ? roundRatio(catalogMargins.length / products.length)
              : null,
          productsBelowStandardMargin: catalogMargins.filter(
            (item) => item.margin < standardFloor
          ).length,
          productsBelowCompetitiveMargin: catalogMargins.filter(
            (item) => item.margin < competitiveFloor
          ).length,
        },
        categoryBreakdown,
        cycleBreakdown,
        lowMarginProducts,
        pricingRules: normalizedRules,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("ERROR PANEL FINANCIERO:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el panel financiero",
      },
      { status: 500 }
    );
  }
}
