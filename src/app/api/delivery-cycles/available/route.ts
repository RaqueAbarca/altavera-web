import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { syncDeliveryCycles } from "@/lib/deliveryCycles.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await syncDeliveryCycles();

    const { data, error } = await supabaseAdmin
      .from("delivery_cycles")
      .select("id,delivery_date,cutoff_at,status")
      .eq("status", "open")
      .gt("cutoff_at", new Date().toISOString())
      .order("delivery_date", { ascending: true })
      .limit(2);

    if (error) throw error;

    return NextResponse.json(
      {
        cycles: data ?? [],
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
