import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getPublicAppSettings } from "@/lib/appSettings.server";
import { getOrderDeliveryTiming } from "@/lib/deliveryTiming.server";
import {
  isOrderStatusEmailStatus,
  sendOrderStatusEmail,
} from "@/lib/orderStatusEmail.server";
import { ALTAVERA_REVIEW_URL } from "@/lib/whatsapp";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DeliveryCycleRelation =
  | { delivery_date?: unknown }
  | Array<{ delivery_date?: unknown }>
  | null;

function getDeliveryDate(value: DeliveryCycleRelation) {
  const relation = Array.isArray(value) ? value[0] : value;
  const deliveryDate = String(relation?.delivery_date ?? "").trim();
  return deliveryDate || null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: unknown };
    const status = String(body.status ?? "").trim();

    if (!isOrderStatusEmailStatus(status)) {
      return NextResponse.json(
        { error: "Estado de pedido no válido." },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        status,
        guest_name,
        guest_email,
        order_access_token,
        delivery_cycle_id,
        delivery_cycles(
          delivery_date
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (orderError) throw orderError;

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado." },
        { status: 404 }
      );
    }

    if (order.status === status) {
      return NextResponse.json({
        ok: true,
        status,
        unchanged: true,
        email: { status: "skipped", reason: "El pedido ya tenía este estado." },
      });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", id)
      .eq("status", order.status)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      return NextResponse.json(
        {
          error:
            "El pedido cambió mientras lo estabas actualizando. Recarga el panel e inténtalo de nuevo.",
        },
        { status: 409 }
      );
    }

    const deliveryDate = getDeliveryDate(order.delivery_cycles);
    const timing = await getOrderDeliveryTiming({
      orderId: order.id,
      deliveryCycleId: String(order.delivery_cycle_id ?? "").trim() || null,
      deliveryDate,
      includeEstimatedArrival: status === "ready",
    });

    let email:
      | { status: "sent"; id: string | null }
      | { status: "skipped"; reason: string }
      | { status: "failed"; reason: string };

    try {
      const settings = await getPublicAppSettings();
      email = await sendOrderStatusEmail({
        to: order.guest_email,
        customerName: order.guest_name,
        orderId: order.id,
        accessToken: String(order.order_access_token ?? ""),
        deliveryDate,
        status,
        contactEmail: settings.contact.email,
        requestOrigin: new URL(request.url).origin,
        deliveryWindowLabel: timing.deliveryWindowLabel,
        estimatedArrivalLabel: timing.estimatedArrivalLabel,
        reviewUrl: status === "delivered" ? ALTAVERA_REVIEW_URL : null,
      });
    } catch (emailError) {
      const reason =
        emailError instanceof Error
          ? emailError.message
          : "No se pudo enviar el correo de actualización.";

      console.error("ERROR ENVIANDO CORREO DE ESTADO DEL PEDIDO:", emailError);
      email = { status: "failed", reason };
    }

    return NextResponse.json({
      ok: true,
      status,
      email,
      deliveryWindowLabel: timing.deliveryWindowLabel,
      estimatedArrivalLabel: timing.estimatedArrivalLabel,
      estimatedArrivalIso: timing.estimatedArrivalIso,
      reviewUrl: status === "delivered" ? ALTAVERA_REVIEW_URL : null,
    });
  } catch (error) {
    console.error("ERROR ACTUALIZANDO ESTADO DEL PEDIDO:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cambiar el estado del pedido.",
      },
      { status: 500 }
    );
  }
}
