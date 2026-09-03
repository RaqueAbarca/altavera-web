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
        total,
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
          maturity_preference
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
        total,
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
          maturity_preference
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

    const { data: productRows, error: productError } = productIds.length
      ? await supabaseAdmin
          .from("products")
          .select("id,category,unit")
          .in("id", productIds)
      : { data: [], error: null };

    if (productError) throw productError;

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

    const enrichOrder = (order: (typeof orders)[number]) => ({
      ...order,
      order_item: (order.order_item ?? []).map((item) => ({
        ...item,
        category:
          item.product_id === null
            ? null
            : productMetaById.get(Number(item.product_id))?.category ?? null,
        unit:
          item.product_id === null
            ? null
            : productMetaById.get(Number(item.product_id))?.unit ?? null,
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
