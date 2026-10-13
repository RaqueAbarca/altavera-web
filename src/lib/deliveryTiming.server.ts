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

const ROUTE_ELIGIBLE_STATUSES = new Set(["confirmed", "preparing", "ready"]);

function validCoordinate(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export type DeliveryTiming = {
  deliveryWindowLabel: string;
  estimatedArrivalLabel: string | null;
  estimatedArrivalIso: string | null;
};

export async function getOrderDeliveryTiming(input: {
  orderId: string;
  deliveryCycleId: string | null;
  deliveryDate: string | null;
  includeEstimatedArrival?: boolean;
}): Promise<DeliveryTiming> {
  const settings = await getAdminAppSettings();
  const deliveryDate = String(input.deliveryDate ?? "").trim();
  const rule = deliveryDate
    ? getDeliveryWindowRule(settings.deliverySchedule, deliveryDate)
    : null;

  const windowStartTime = rule?.windowStartTime ?? "12:00";
  const windowEndTime = rule?.windowEndTime ?? "16:00";
  const deliveryWindowLabel = formatDeliveryWindow(
    windowStartTime,
    windowEndTime
  );

  if (
    !input.includeEstimatedArrival ||
    !deliveryDate ||
    !input.deliveryCycleId ||
    !isOpenRouteServiceConfigured()
  ) {
    return {
      deliveryWindowLabel,
      estimatedArrivalLabel: null,
      estimatedArrivalIso: null,
    };
  }

  const originLatitude = settings.deliveryDistance.originLatitude;
  const originLongitude = settings.deliveryDistance.originLongitude;
  if (originLatitude === null || originLongitude === null) {
    return {
      deliveryWindowLabel,
      estimatedArrivalLabel: null,
      estimatedArrivalIso: null,
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id,status,latitude,longitude")
      .eq("delivery_cycle_id", input.deliveryCycleId);

    if (error) throw error;

    const stops = (data ?? []).flatMap((order) => {
      if (!ROUTE_ELIGIBLE_STATUSES.has(String(order.status))) return [];
      const latitude = validCoordinate(order.latitude, -90, 90);
      const longitude = validCoordinate(order.longitude, -180, 180);
      if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) {
        return [];
      }
      return [{ orderId: String(order.id), latitude, longitude }];
    });

    if (!stops.some((stop) => stop.orderId === input.orderId)) {
      return {
        deliveryWindowLabel,
        estimatedArrivalLabel: null,
        estimatedArrivalIso: null,
      };
    }

    const plan = await optimizeOpenRouteServiceDeliveries({
      origin: { latitude: originLatitude, longitude: originLongitude },
      stops,
      serviceMinutesPerStop: settings.deliveryDistance.stopMinutes ?? 0,
    });

    const target = plan.stops.find((stop) => stop.orderId === input.orderId);
    if (!target) {
      return {
        deliveryWindowLabel,
        estimatedArrivalLabel: null,
        estimatedArrivalIso: null,
      };
    }

    const routeStart = getDeliveryRouteStart(
      deliveryDate,
      windowStartTime,
      new Date()
    );
    const estimatedArrival = new Date(
      routeStart.getTime() + target.arrivalMinutesFromStart * 60_000
    );

    return {
      deliveryWindowLabel,
      estimatedArrivalLabel: formatEstimatedArrival(estimatedArrival),
      estimatedArrivalIso: estimatedArrival.toISOString(),
    };
  } catch (error) {
    console.error("ERROR CALCULANDO HORA ESTIMADA DE ENTREGA:", error);
    return {
      deliveryWindowLabel,
      estimatedArrivalLabel: null,
      estimatedArrivalIso: null,
    };
  }
}
