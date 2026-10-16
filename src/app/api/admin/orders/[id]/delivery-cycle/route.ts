import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { deliveryCycleId?: unknown };
    const deliveryCycleId = String(body.deliveryCycleId ?? "").trim();

    if (!deliveryCycleId) {
      return NextResponse.json(
        { error: "Seleccioná una fecha de entrega válida." },
        { status: 400 }
      );
    }

    const [{ data: order, error: orderError }, { data: targetCycle, error: cycleError }] =
      await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("id,delivery_cycle_id,status")
          .eq("id", id)
          .maybeSingle(),
        supabaseAdmin
          .from("delivery_cycles")
          .select("id,delivery_date,status,cutoff_at")
          .eq("id", deliveryCycleId)
          .maybeSingle(),
      ]);

    if (orderError) throw orderError;
    if (cycleError) throw cycleError;

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado." },
        { status: 404 }
      );
    }

    if (!targetCycle) {
      return NextResponse.json(
        { error: "La fecha de entrega seleccionada no existe." },
        { status: 404 }
      );
    }

    if (order.delivery_cycle_id === targetCycle.id) {
      return NextResponse.json({
        ok: true,
        unchanged: true,
        deliveryCycleId: targetCycle.id,
        deliveryDate: targetCycle.delivery_date,
        cycleStatus: targetCycle.status,
      });
    }

    // Este endpoint es una corrección administrativa. A diferencia del checkout,
    // permite mover pedidos a un ciclo cerrado porque el admin puede necesitar
    // agregar manualmente un pedido aun después de haber realizado el corte.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ delivery_cycle_id: targetCycle.id })
      .eq("id", order.id)
      .select("id,delivery_cycle_id")
      .maybeSingle();

    if (updateError) throw updateError;

    if (!updated) {
      return NextResponse.json(
        { error: "No se pudo mover el pedido. Recargá el panel e intentá de nuevo." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      deliveryCycleId: targetCycle.id,
      deliveryDate: targetCycle.delivery_date,
      cycleStatus: targetCycle.status,
    });
  } catch (error) {
    console.error("ERROR CAMBIANDO FECHA DE ENTREGA DEL PEDIDO:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cambiar la fecha de entrega.",
      },
      { status: 500 }
    );
  }
}
