import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ALTAVERA_REVIEW_URL } from "@/lib/whatsapp";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type DeliveryCycleRelation =
  | { delivery_date?: unknown }
  | Array<{ delivery_date?: unknown }>
  | null;

function relationDeliveryDate(value: DeliveryCycleRelation) {
  const relation = Array.isArray(value) ? value[0] : value;
  const date = String(relation?.delivery_date ?? "").trim();
  return date || null;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        guest_name,
        subtotal,
        shipping,
        total,
        payment_method,
        status,
        created_at,
        address_description,
        delivery_cycle_id,
        delivery_cycles(delivery_date),
        order_item(
          id,
          product_name,
          price,
          quantity,
          maturity_preference,
          unit
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    const { data: refunds, error: refundsError } = await supabaseAdmin
      .from("money_refunds")
      .select("order_item_id,product_name_snapshot,amount,paid,paid_at")
      .eq("order_id", id);

    if (refundsError) {
      // Un comprobante no debe dejar de imprimirse por un problema secundario
      // con el historial de reembolsos.
      console.error("ERROR CARGANDO REEMBOLSOS DEL COMPROBANTE:", refundsError);
    }

    const safeRefunds = refunds ?? [];
    const refundTotal = safeRefunds.reduce(
      (sum, refund) => sum + numberValue(refund.amount),
      0
    );
    const grossTotal = numberValue(order.total);

    return NextResponse.json({
      order: {
        id: order.id,
        customerName: String(order.guest_name ?? "").trim(),
        subtotal: numberValue(order.subtotal),
        shipping: numberValue(order.shipping),
        total: grossTotal,
        finalTotal: Math.max(0, grossTotal - refundTotal),
        paymentMethod: String(order.payment_method ?? ""),
        status: String(order.status ?? ""),
        createdAt: order.created_at,
        deliveryDate: relationDeliveryDate(order.delivery_cycles as DeliveryCycleRelation),
        addressDescription: String(order.address_description ?? "").trim() || null,
        items: (order.order_item ?? []).map((item) => ({
          id: item.id,
          productName: String(item.product_name ?? ""),
          price: numberValue(item.price),
          quantity: numberValue(item.quantity),
          maturityPreference: item.maturity_preference ?? null,
          unit: item.unit ?? null,
        })),
      },
      refunds: safeRefunds.map((refund) => ({
        orderItemId: String(refund.order_item_id),
        productName: String(refund.product_name_snapshot ?? ""),
        amount: numberValue(refund.amount),
        paid: Boolean(refund.paid),
        paidAt: refund.paid_at ?? null,
      })),
      refundTotal,
      reviewUrl: ALTAVERA_REVIEW_URL,
    });
  } catch (error) {
    console.error("ERROR GENERANDO COMPROBANTE DEL PEDIDO:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo generar el comprobante del pedido.",
      },
      { status: 500 }
    );
  }
}
