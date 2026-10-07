import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { syncDeliveryCycles } from "@/lib/deliveryCycles.server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    await syncDeliveryCycles();

    const { data: cycleRows, error: cycleError } = await supabaseAdmin
      .from("delivery_cycles")
      .select("id,delivery_date,cutoff_at,status,closed_at")
      .order("delivery_date", { ascending: false })
      .limit(40);

    if (cycleError) throw cycleError;

    const cycles = cycleRows ?? [];
    const cycleIds = cycles.map((cycle) => cycle.id);

    const ordersQuery = supabaseAdmin
      .from("orders")
      .select(`
        id,
        guest_name,
        guest_phone,
        subtotal,
        shipping,
        total,
        payment_method,
        status,
        created_at,
        customer_notes,
        latitude,
        longitude,
        address_description,
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
      .order("created_at", { ascending: false });

    const { data: orderRows, error: orderError } = cycleIds.length
      ? await ordersQuery.in("delivery_cycle_id", cycleIds)
      : { data: [], error: null };

    if (orderError) throw orderError;

    const { data: legacyRows, error: legacyError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        guest_name,
        guest_phone,
        subtotal,
        shipping,
        total,
        payment_method,
        status,
        created_at,
        customer_notes,
        latitude,
        longitude,
        address_description,
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
      .is("delivery_cycle_id", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (legacyError) throw legacyError;

    const { data: listRows, error: listError } = cycleIds.length
      ? await supabaseAdmin
          .from("shopping_lists")
          .select(`
            id,
            delivery_cycle_id,
            created_at,
            finalized_at,
            shopping_list_items(
              id,
              product_id,
              product_name,
              quantity,
              unit,
              maturity_preference
            )
          `)
          .in("delivery_cycle_id", cycleIds)
      : { data: [], error: null };

    if (listError) throw listError;

    const orders = orderRows ?? [];
    const lists = listRows ?? [];

    const productIds = Array.from(
      new Set(
        [
          ...orders.flatMap((order) =>
            (order.order_item ?? []).map((item) => item.product_id)
          ),
          ...lists.flatMap((list) =>
            (list.shopping_list_items ?? []).map((item) => item.product_id)
          ),
        ].filter((id): id is number => typeof id === "number")
      )
    );

    const [{ data: productRows, error: productError }, { data: latestPricingRun, error: pricingRunError }] =
      await Promise.all([
        productIds.length
          ? supabaseAdmin
              .from("products")
              .select("id,category,unit")
              .in("id", productIds)
          : Promise.resolve({ data: [], error: null }),
        supabaseAdmin
          .from("pricing_runs")
          .select("id")
          .eq("status", "completed")
          .not("cycle_id", "is", null)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (productError) throw productError;
    if (pricingRunError) throw pricingRunError;

    const { data: cenadaReferenceRows, error: cenadaReferenceError } =
      productIds.length && latestPricingRun?.id
        ? await supabaseAdmin
            .from("price_recommendations")
            .select("product_id,cenada_price,cenada_source_date")
            .eq("run_id", latestPricingRun.id)
            .in("product_id", productIds)
        : { data: [], error: null };

    if (cenadaReferenceError) throw cenadaReferenceError;

    const productMetaById = new Map<
      number,
      { category: string | null; unit: string | null }
    >(
      (productRows ?? []).map((product) => [
        Number(product.id),
        {
          category: product.category ?? null,
          unit: product.unit ?? null,
        },
      ])
    );

    const cenadaReferenceByProduct = new Map<
      number,
      { price: number | null; date: string | null }
    >(
      (cenadaReferenceRows ?? []).map((row) => [
        Number(row.product_id),
        {
          price: row.cenada_price === null ? null : Number(row.cenada_price),
          date: row.cenada_source_date ?? null,
        },
      ])
    );

    const enrichOrder = (order: (typeof orders)[number]) => ({
      ...order,
      order_item: (order.order_item ?? []).map((item) => ({
        ...item,
        category:
          item.product_id === null
            ? null
            : productMetaById.get(Number(item.product_id))?.category ?? null,
        unit:
          item.unit?.trim() ||
          (item.product_id === null
            ? null
            : productMetaById.get(Number(item.product_id))?.unit ?? null),
        cenada_reference_price:
          item.product_id === null
            ? null
            : cenadaReferenceByProduct.get(Number(item.product_id))?.price ?? null,
        cenada_reference_date:
          item.product_id === null
            ? null
            : cenadaReferenceByProduct.get(Number(item.product_id))?.date ?? null,
      })),
    });

    const enrichList = (list: (typeof lists)[number]) => ({
      ...list,
      shopping_list_items: (list.shopping_list_items ?? []).map((item) => ({
        ...item,
        category:
          item.product_id === null
            ? null
            : productMetaById.get(Number(item.product_id))?.category ?? null,
        cenada_reference_price:
          item.product_id === null
            ? null
            : cenadaReferenceByProduct.get(Number(item.product_id))?.price ?? null,
        cenada_reference_date:
          item.product_id === null
            ? null
            : cenadaReferenceByProduct.get(Number(item.product_id))?.date ?? null,
      })),
    });

    const enrichedOrders = orders.map(enrichOrder);
    const enrichedLists = lists.map(enrichList);

    const responseCycles = cycles.map((cycle) => ({
      ...cycle,
      orders: enrichedOrders.filter(
        (order) => order.delivery_cycle_id === cycle.id
      ),
      shoppingList:
        enrichedLists.find(
          (list) => list.delivery_cycle_id === cycle.id
        ) ?? null,
    }));

    return NextResponse.json(
      {
        cycles: responseCycles,
        legacyOrders: legacyRows ?? [],
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("ERROR PANEL CICLOS DE ENTREGA:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el panel de pedidos" },
      { status: 500 }
    );
  }
}
