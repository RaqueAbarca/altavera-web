import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncDeliveryCycles } from "@/lib/deliveryCycles.server";
import { getAdminAppSettings } from "@/lib/appSettings.server";
import { getDeliveryWeekday } from "@/lib/deliverySchedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await syncDeliveryCycles();

    const [{ data, error }, settings] = await Promise.all([
      supabaseAdmin
        .from("delivery_cycles")
        .select("id,delivery_date,cutoff_at,status")
        .eq("status", "open")
        .gt("cutoff_at", new Date().toISOString())
        .order("delivery_date", { ascending: true })
        .limit(3),
      getAdminAppSettings(),
    ]);

    if (error) throw error;

    const cycles = (data ?? []).map((cycle) => {
      const weekday = getDeliveryWeekday(cycle.delivery_date);
      const rule = settings.deliverySchedule.find(
        (item) => item.deliveryWeekday === weekday
      );

      return {
        ...cycle,
        window_start_time: rule?.windowStartTime ?? "12:00",
        window_end_time: rule?.windowEndTime ?? "16:00",
      };
    });

    return NextResponse.json(
      {
        cycles,
        serverNow: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("ERROR CARGANDO CICLOS DE ENTREGA:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las próximas entregas" },
      { status: 500 }
    );
  }
}
