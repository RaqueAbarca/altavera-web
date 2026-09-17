import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { consumeRateLimit, getClientFingerprint } from "@/lib/rateLimit.server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const fingerprint = getClientFingerprint(request);
    const rateLimit = await consumeRateLimit({
      key: `order-read:ip:${fingerprint}`,
      limit: 60,
      windowSeconds: 10 * 60,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas consultas. Espera un momento e inténtalo de nuevo." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds || 30),
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const { id } = await context.params;
    const accessToken = request.headers.get(
      "x-order-access-token"
    );

    const {
      data: order,
      error,
    } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        customer_id,
        user_id,
        order_access_token,
        customer_notes,
        guest_email,
        address_description,
        subtotal,
        shipping,
        total,
        payment_method,
        status,
        created_at,
        delivery_cycles(
          delivery_date
        ),
        order_item(
          id,
          product_name,
          price,
          quantity,
          unit,
          maturity_preference
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isOwner = Boolean(
      user &&
        (
          order.customer_id === user.id ||
          order.user_id === user.id
        )
    );

    const hasValidToken = Boolean(
      accessToken &&
        order.order_access_token === accessToken
    );

    if (!isOwner && !hasValidToken) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: order.id,
      customer_notes: order.customer_notes,
      has_email: Boolean(order.guest_email),
      address_description: order.address_description,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      total: Number(order.total),
      payment_method: order.payment_method,
      status: order.status,
      created_at: order.created_at,
      delivery_cycle: order.delivery_cycles ?? null,
      order_item: order.order_item ?? [],
    });
  } catch (error) {
    console.error("ERROR CARGANDO PEDIDO SEGURO:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el pedido" },
      { status: 500 }
    );
  }
}
