import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const accessToken = request.headers.get("x-order-access-token");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        customer_id,
        user_id,
        order_access_token,
        status,
        created_at,
        delivery_cycles(
          delivery_date
        ),
        order_item(
          id,
          product_name,
          quantity,
          unit,
          maturity_preference
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!order) {
      return NextResponse.json(
        { error: "Seguimiento no disponible" },
        { status: 404 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isOwner = Boolean(
      user &&
        (order.customer_id === user.id || order.user_id === user.id)
    );

    const hasValidToken = Boolean(
      accessToken && order.order_access_token === accessToken
    );

    if (!isOwner && !hasValidToken) {
      // Respondemos igual que cuando el pedido no existe para no revelar
      // información sobre números de pedido válidos.
      return NextResponse.json(
        { error: "Seguimiento no disponible" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      created_at: order.created_at,
      delivery_cycle: order.delivery_cycles ?? null,
      order_item: order.order_item ?? [],
    });
  } catch (error) {
    console.error("ERROR CARGANDO SEGUIMIENTO DE PEDIDO:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el seguimiento" },
      { status: 500 }
    );
  }
}
