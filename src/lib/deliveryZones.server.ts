import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  DELIVERY_COVERAGE_ZONES,
  getCoverageDisplayPolygon,
  pointInPolygon,
  type DeliveryAvailability,
} from "@/lib/deliveryCoverage";
import type { DeliveryZone } from "@/lib/deliveryZones";

type DeliveryZoneRow = {
  id: string;
  name: string;
  zone_type: "include" | "exclude";
  polygon: unknown;
  enabled: boolean | null;
  sort_order: number | null;
};

function legacyZones(): DeliveryZone[] {
  return DELIVERY_COVERAGE_ZONES.map((zone, index) => ({
    id: zone.id,
    name: zone.label,
    type: "include" as const,
    polygon: getCoverageDisplayPolygon(zone),
    enabled: true,
    sortOrder: index,
  }));
}

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("id,name,zone_type,polygon,enabled,sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    // Mantiene el checkout funcionando antes de aplicar la migración.
    if (error.code === "42P01" || error.code === "PGRST205") return legacyZones();
    console.error("ERROR CARGANDO ZONAS DE ENTREGA:", error);
    throw error;
  }

  return ((data ?? []) as DeliveryZoneRow[]).flatMap((row) => {
    if (!Array.isArray(row.polygon)) return [];
    const polygon = row.polygon
      .filter((point): point is [number, number] =>
        Array.isArray(point) && point.length === 2 &&
        Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))
      )
      .map((point) => [Number(point[0]), Number(point[1])] as [number, number]);
    if (polygon.length < 3) return [];
    return [{
      id: row.id,
      name: row.name,
      type: row.zone_type,
      polygon,
      enabled: row.enabled ?? true,
      sortOrder: row.sort_order ?? 0,
    }];
  });
}

export async function evaluateStoredDeliveryLocation(
  latitude: number,
  longitude: number
): Promise<DeliveryAvailability> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { available: false, status: "outside", zone: null };
  }

  const zones = await getDeliveryZones();
  const included = zones.find((zone) =>
    zone.enabled && zone.type === "include" &&
    pointInPolygon(longitude, latitude, zone.polygon)
  );

  if (!included) return { available: false, status: "outside", zone: null };

  const excluded = zones.some((zone) =>
    zone.enabled && zone.type === "exclude" &&
    pointInPolygon(longitude, latitude, zone.polygon)
  );

  if (excluded) return { available: false, status: "blocked", zone: null };
  return { available: true, status: "covered", zone: included.name };
}
