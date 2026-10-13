const ORS_DIRECTIONS_URL =
  "https://api.heigit.org/openrouteservice/v2/directions/driving-car/json";
const ORS_OPTIMIZATION_URL = "https://api.heigit.org/vroom/v0";
const REQUEST_TIMEOUT_MS = 12_000;

export type RoutingPoint = {
  latitude: number;
  longitude: number;
};

export type RoundTripRoute = {
  oneWayDistanceKm: number;
  returnDistanceKm: number;
  roundTripDistanceKm: number;
  drivingMinutes: number;
};

export type OptimizationStop = RoutingPoint & {
  orderId: string;
};

export type OptimizedDeliveryStop = {
  orderId: string;
  arrivalMinutesFromStart: number;
};

export type OptimizedDeliveryRoute = {
  orderedOrderIds: string[];
  unassignedOrderIds: string[];
  stops: OptimizedDeliveryStop[];
  distanceKm: number;
  drivingMinutes: number;
  serviceMinutes: number;
  totalMinutes: number;
};

type OrsDirectionsResponse = {
  routes?: Array<{
    summary?: { distance?: number; duration?: number };
    segments?: Array<{ distance?: number; duration?: number }>;
  }>;
  error?: { message?: string } | string;
};

type VroomResponse = {
  code?: number;
  error?: string;
  summary?: {
    distance?: number;
    duration?: number;
    service?: number;
    unassigned?: number;
  };
  routes?: Array<{
    distance?: number;
    duration?: number;
    service?: number;
    steps?: Array<{
      type?: string;
      id?: number;
      arrival?: number;
      duration?: number;
    }>;
  }>;
  unassigned?: Array<{ id?: number }>;
};

function getApiKey() {
  return (
    process.env.OPENROUTESERVICE_API_KEY?.trim() ||
    process.env.ORS_API_KEY?.trim() ||
    ""
  );
}

export function isOpenRouteServiceConfigured() {
  return Boolean(getApiKey());
}

async function orsFetch<T>(url: string, body: unknown): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "OpenRouteService no está configurado. Agrega OPENROUTESERVICE_API_KEY en las variables de entorno."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    const raw = await response.text();
    let data: unknown = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const candidate = data as
        | { error?: { message?: string } | string; message?: string }
        | null;
      const detail =
        typeof candidate?.error === "string"
          ? candidate.error
          : candidate?.error?.message || candidate?.message || raw;
      throw new Error(
        detail?.trim()
          ? `OpenRouteService: ${detail.trim().slice(0, 240)}`
          : `OpenRouteService respondió ${response.status}.`
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenRouteService tardó demasiado en responder.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getOpenRouteServiceRoundTrip(
  origin: RoutingPoint,
  destination: RoutingPoint
): Promise<RoundTripRoute> {
  const data = await orsFetch<OrsDirectionsResponse>(ORS_DIRECTIONS_URL, {
    coordinates: [
      [origin.longitude, origin.latitude],
      [destination.longitude, destination.latitude],
      [origin.longitude, origin.latitude],
    ],
    instructions: false,
  });

  const route = data.routes?.[0];
  const summary = route?.summary;
  if (
    !summary ||
    typeof summary.distance !== "number" || !Number.isFinite(summary.distance) ||
    typeof summary.duration !== "number" || !Number.isFinite(summary.duration)
  ) {
    throw new Error("OpenRouteService no devolvió una ruta válida.");
  }

  const firstSegment = route?.segments?.[0];
  const secondSegment = route?.segments?.[1];
  const totalDistanceMeters = summary.distance;

  const oneWayMeters =
    typeof firstSegment?.distance === "number" && Number.isFinite(firstSegment.distance)
      ? firstSegment.distance
      : totalDistanceMeters / 2;
  const returnMeters =
    typeof secondSegment?.distance === "number" && Number.isFinite(secondSegment.distance)
      ? secondSegment.distance
      : totalDistanceMeters - oneWayMeters;

  return {
    oneWayDistanceKm: oneWayMeters / 1000,
    returnDistanceKm: returnMeters / 1000,
    roundTripDistanceKm: totalDistanceMeters / 1000,
    drivingMinutes: summary.duration / 60,
  };
}

export async function optimizeOpenRouteServiceDeliveries(input: {
  origin: RoutingPoint;
  stops: OptimizationStop[];
  serviceMinutesPerStop: number;
}): Promise<OptimizedDeliveryRoute> {
  if (input.stops.length === 0) {
    return {
      orderedOrderIds: [],
      unassignedOrderIds: [],
      stops: [],
      distanceKm: 0,
      drivingMinutes: 0,
      serviceMinutes: 0,
      totalMinutes: 0,
    };
  }

  if (input.stops.length > 50) {
    throw new Error(
      "La optimización pública de OpenRouteService admite hasta 50 paradas por ruta."
    );
  }

  const idToOrderId = new Map<number, string>();
  const jobs = input.stops.map((stop, index) => {
    const id = index + 1;
    idToOrderId.set(id, stop.orderId);
    return {
      id,
      description: stop.orderId,
      location: [stop.longitude, stop.latitude],
      service: Math.max(0, Math.round(input.serviceMinutesPerStop * 60)),
    };
  });

  const data = await orsFetch<VroomResponse>(ORS_OPTIMIZATION_URL, {
    jobs,
    vehicles: [
      {
        id: 1,
        profile: "driving-car",
        start: [input.origin.longitude, input.origin.latitude],
        end: [input.origin.longitude, input.origin.latitude],
      },
    ],
    options: { g: "true" },
  });

  if (data.code !== undefined && data.code !== 0) {
    throw new Error(data.error || "OpenRouteService no pudo optimizar la ruta.");
  }

  const route = data.routes?.[0];
  if (!route) {
    throw new Error("OpenRouteService no devolvió una ruta optimizada.");
  }

  const jobSteps = (route.steps ?? []).filter(
    (step) => step.type === "job" && typeof step.id === "number"
  );

  const orderedOrderIds = jobSteps
    .map((step) => idToOrderId.get(step.id!))
    .filter((value): value is string => Boolean(value));

  const stops = jobSteps.flatMap((step) => {
    const orderId = idToOrderId.get(step.id!);
    if (!orderId) return [];

    const arrivalSeconds = Number(step.arrival ?? step.duration ?? 0);
    return [{
      orderId,
      arrivalMinutesFromStart: Number.isFinite(arrivalSeconds)
        ? Math.max(0, arrivalSeconds / 60)
        : 0,
    }];
  });

  const unassignedOrderIds = (data.unassigned ?? [])
    .map((item) => (typeof item.id === "number" ? idToOrderId.get(item.id) : undefined))
    .filter((value): value is string => Boolean(value));

  const distanceMeters = Number(route.distance ?? data.summary?.distance ?? 0);
  const drivingSeconds = Number(route.duration ?? data.summary?.duration ?? 0);
  const serviceSeconds = Number(route.service ?? data.summary?.service ?? 0);

  return {
    orderedOrderIds,
    unassignedOrderIds,
    stops,
    distanceKm: Number.isFinite(distanceMeters) ? distanceMeters / 1000 : 0,
    drivingMinutes: Number.isFinite(drivingSeconds) ? drivingSeconds / 60 : 0,
    serviceMinutes: Number.isFinite(serviceSeconds) ? serviceSeconds / 60 : 0,
    totalMinutes:
      (Number.isFinite(drivingSeconds) ? drivingSeconds : 0) / 60 +
      (Number.isFinite(serviceSeconds) ? serviceSeconds : 0) / 60,
  };
}
