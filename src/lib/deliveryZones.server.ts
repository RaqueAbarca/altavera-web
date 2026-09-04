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

const CURRENT_PUBLIC_INCLUDE_ZONE_NAMES = new Set([
  "alajuela",
  "alajuela central",
  "cantón de alajuela",
  "canton de alajuela",
]);

function isCurrentPublicIncludeZone(zone: DeliveryZone) {
  return CURRENT_PUBLIC_INCLUDE_ZONE_NAMES.has(
    zone.name.trim().toLocaleLowerCase("es-CR")
  );
}

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

  const parsedZones = ((data ?? []) as DeliveryZoneRow[]).flatMap((row) => {
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

  // Lanzamiento: solo se publica la zona de Alajuela.
  // Las demás pueden conservarse en admin desactivadas o preparadas para una expansión futura.
  const exclusions = parsedZones.filter((zone) => zone.type === "exclude");
  const alajuelaZones = parsedZones.filter(
    (zone) => zone.type === "include" && isCurrentPublicIncludeZone(zone)
  );

  return alajuelaZones.length > 0
    ? [...alajuelaZones, ...exclusions]
    : [...legacyZones(), ...exclusions];
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
