import type { LngLat } from "@/lib/deliveryCoverage";

export type DeliveryZoneType = "include" | "exclude";

export type DeliveryZone = {
  id: string;
  name: string;
  type: DeliveryZoneType;
  polygon: LngLat[];
  enabled: boolean;
  sortOrder: number;
};

export function isValidDeliveryPolygon(value: unknown): value is LngLat[] {
  if (!Array.isArray(value) || value.length < 3) return false;
  return value.every((point) =>
    Array.isArray(point) &&
    point.length === 2 &&
    Number.isFinite(Number(point[0])) &&
    Number.isFinite(Number(point[1])) &&
    Number(point[0]) >= -180 &&
    Number(point[0]) <= 180 &&
    Number(point[1]) >= -90 &&
    Number(point[1]) <= 90
  );
}

export function normalizeDeliveryPolygon(value: unknown): LngLat[] | null {
  if (!isValidDeliveryPolygon(value)) return null;
  const polygon = value.map((point) => [Number(point[0]), Number(point[1])] as LngLat);
  if (polygon.length > 1) {
    const first = polygon[0];
    const last = polygon[polygon.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) polygon.pop();
  }
  return polygon.length >= 3 ? polygon : null;
}
