import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getAdminAppSettings } from "@/lib/appSettings.server";
import {
  formatDeliveryWindow,
  formatEstimatedArrival,
  getDeliveryRouteStart,
  getDeliveryWindowRule,
} from "@/lib/deliverySchedule";
import {
  isOpenRouteServiceConfigured,
  optimizeOpenRouteServiceDeliveries,
} from "@/lib/routing/openRouteService.server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ELIGIBLE_STATUSES = new Set(["confirmed", "preparing", "ready"]);

function validCoordinate(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    if (!isOpenRouteServiceConfigured()) {
      return NextResponse.json(
        {
          error:
            "OpenRouteService no está configurado. Agrega OPENROUTESERVICE_API_KEY en Vercel y en tu .env.local.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { cycleId?: unknown };
    const cycleId = typeof body.cycleId === "string" ? body.cycleId.trim() : "";
    if (!cycleId) {
      return NextResponse.json({ error: "Ciclo de entrega inválido." }, { status: 400 });
    }

    const settings = await getAdminAppSettings();
    const originLatitude = settings.deliveryDistance.originLatitude;
    const originLongitude = settings.deliveryDistance.originLongitude;

    if (originLatitude === null || originLongitude === null) {
      return NextResponse.json(
        { error: "Configura el punto de salida en Admin → Configuración → Entregas." },
        { status: 400 }
      );
    }

    const [{ data: cycle, error: cycleError }, { data, error }] = await Promise.all([
      supabaseAdmin
        .from("delivery_cycles")
        .select("id,delivery_date")
        .eq("id", cycleId)
        .maybeSingle(),
      supabaseAdmin
        .from("orders")
        .select("id,status,latitude,longitude")
        .eq("delivery_cycle_id", cycleId),
    ]);

    if (cycleError) throw cycleError;
    if (error) throw error;
    if (!cycle) {
      return NextResponse.json({ error: "Ciclo de entrega no encontrado." }, { status: 404 });
    }

    const stops = (data ?? []).flatMap((order) => {
      if (!ELIGIBLE_STATUSES.has(String(order.status))) return [];
      const latitude = validCoordinate(order.latitude, -90, 90);
      const longitude = validCoordinate(order.longitude, -180, 180);
      if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) {
        return [];
      }
      return [{ orderId: String(order.id), latitude, longitude }];
    });

    if (stops.length === 0) {
      return NextResponse.json(
        {
          error:
            "No hay pedidos confirmados, preparando o en camino con ubicación válida para optimizar.",
        },
        { status: 400 }
      );
    }

    const serviceMinutesPerStop = settings.deliveryDistance.stopMinutes ?? 0;
    const plan = await optimizeOpenRouteServiceDeliveries({
      origin: { latitude: originLatitude, longitude: originLongitude },
      stops,
      serviceMinutesPerStop,
    });

    const rule = getDeliveryWindowRule(
      settings.deliverySchedule,
      cycle.delivery_date
    );
    const windowStartTime = rule?.windowStartTime ?? "12:00";
    const windowEndTime = rule?.windowEndTime ?? "16:00";
    const deliveryWindowLabel = formatDeliveryWindow(
      windowStartTime,
      windowEndTime
    );
    const routeStart = getDeliveryRouteStart(
      cycle.delivery_date,
      windowStartTime,
      new Date()
    );

    const routeStops = plan.stops.map((stop) => {
      const estimatedArrival = new Date(
        routeStart.getTime() + stop.arrivalMinutesFromStart * 60_000
      );
      return {
        orderId: stop.orderId,
        arrivalMinutesFromStart: round2(stop.arrivalMinutesFromStart),
        estimatedArrivalIso: estimatedArrival.toISOString(),
        estimatedArrivalLabel: formatEstimatedArrival(estimatedArrival),
      };
    });
    const routeEnd = new Date(routeStart.getTime() + plan.totalMinutes * 60_000);
    const promisedWindowEnd = new Date(
      `${cycle.delivery_date}T${windowEndTime}:00-06:00`
    );
    const exceedsDeliveryWindow =
      Number.isFinite(promisedWindowEnd.getTime()) &&
      routeEnd.getTime() > promisedWindowEnd.getTime();

    return NextResponse.json(
      {
        provider: "openrouteservice",
        origin: { latitude: originLatitude, longitude: originLongitude },
        stopCount: stops.length,
        serviceMinutesPerStop,
        orderedOrderIds: plan.orderedOrderIds,
        unassignedOrderIds: plan.unassignedOrderIds,
        stops: routeStops,
        deliveryWindowLabel,
        routeStartIso: routeStart.toISOString(),
        routeStartLabel: formatEstimatedArrival(routeStart),
        routeEndIso: routeEnd.toISOString(),
        routeEndLabel: formatEstimatedArrival(routeEnd),
        exceedsDeliveryWindow,
        distanceKm: round2(plan.distanceKm),
        drivingMinutes: round2(plan.drivingMinutes),
        serviceMinutes: round2(plan.serviceMinutes),
        totalMinutes: round2(plan.totalMinutes),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ERROR OPTIMIZANDO RUTA DE ENTREGA:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo optimizar la ruta.",
      },
      { status: 500 }
    );
  }
}
