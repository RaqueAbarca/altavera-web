import { NextResponse } from "next/server";
import { DELIVERY_UNAVAILABLE_MESSAGE } from "@/lib/deliveryCoverage";
import { evaluateDeliveryLocation } from "@/lib/deliveryAvailability.server";
import { getDeliveryQuoteForOrder } from "@/lib/appSettings.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      latitude?: unknown;
      longitude?: unknown;
    };

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) {
      return NextResponse.json({ error: "Ubicación inválida" }, { status: 400 });
    }

    const availability = await evaluateDeliveryLocation(latitude, longitude);
    if (!availability.available) {
      return NextResponse.json(
        { error: DELIVERY_UNAVAILABLE_MESSAGE, code: "DELIVERY_UNAVAILABLE" },
        { status: 400 }
      );
    }

    const quote = await getDeliveryQuoteForOrder({ latitude, longitude });

    return NextResponse.json({
      shipping: quote.shippingCrc,
      mode: quote.mode,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("ERROR CALCULANDO ENVÍO:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "No se pudo calcular el costo de envío",
      },
      { status: 400 }
    );
  }
}
