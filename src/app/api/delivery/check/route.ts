import { NextResponse } from "next/server";
import { evaluateDeliveryLocation } from "@/lib/deliveryAvailability.server";

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
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: "Ubicación inválida" },
        { status: 400 }
      );
    }

    const availability = await evaluateDeliveryLocation(
      latitude,
      longitude
    );

    return NextResponse.json({
      available: availability.available,
      status: availability.available
        ? "covered"
        : "unavailable",
      zone: availability.available
        ? availability.zone
        : null,
    });
  } catch (error) {
    console.error(
      "ERROR VALIDANDO COBERTURA:",
      error
    );

    return NextResponse.json(
      { error: "No se pudo validar la ubicación" },
      { status: 500 }
    );
  }
}
