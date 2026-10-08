import { NextResponse } from "next/server";
import { getDeliveryZones } from "@/lib/deliveryZones.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const zones = await getDeliveryZones();
    return NextResponse.json(
      {
        zones: zones
          .filter((zone) => zone.enabled)
          .map((zone) => ({
            id: zone.id,
            name: zone.type === "include" ? zone.name : "Zona no disponible",
            type: zone.type,
            polygon: zone.polygon,
          })),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("ERROR PUBLICANDO COBERTURA:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la cobertura" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  }
}
