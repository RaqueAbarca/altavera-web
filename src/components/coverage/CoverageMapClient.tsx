"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  DELIVERY_COVERAGE_ZONES,
  getCoverageDisplayPolygon,
  pointInPolygon,
  toLeafletLatLngs,
  type LngLat,
} from "@/lib/deliveryCoverage";
import type { DeliveryZoneType } from "@/lib/deliveryZones";
import AltaveraMapLayer from "@/components/map/AltaveraMapLayer";

type PublicDeliveryZone = {
  id: string;
  name: string;
  type: DeliveryZoneType;
  polygon: LngLat[];
};

const fallbackZones: PublicDeliveryZone[] = DELIVERY_COVERAGE_ZONES.map((zone) => ({
  id: zone.id,
  name: zone.label,
  type: "include",
  polygon: getCoverageDisplayPolygon(zone),
}));

function buildCoveragePolygons(zones: PublicDeliveryZone[]) {
  const inclusions = zones.filter((zone) => zone.type === "include");
  const exclusions = zones.filter((zone) => zone.type === "exclude");
  return inclusions.map((zone) => {
    const rings = [toLeafletLatLngs(zone.polygon)];
    for (const exclusion of exclusions) {
      const point = exclusion.polygon[0];
      const overlaps = exclusion.polygon.some((point) =>
        pointInPolygon(point[0], point[1], zone.polygon)
      );
      if (overlaps) rings.push(toLeafletLatLngs(exclusion.polygon));
    }
    return rings;
  });
}

export default function CoverageMapClient() {
  const [zones, setZones] = useState<PublicDeliveryZone[]>(fallbackZones);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/delivery/zones", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar la cobertura");
        return response.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.zones)) setZones(data.zones);
      })
      .catch(() => {
        // Si la API falla, se conserva la cobertura estática de respaldo.
      });
    return () => { cancelled = true; };
  }, []);

  const coverageMultiPolygon = useMemo(() => buildCoveragePolygons(zones), [zones]);

  return (
    <MapContainer center={[10.016,-84.214]} zoom={14} scrollWheelZoom className="coverage-map">
      <AltaveraMapLayer />
      <Polygon
        positions={coverageMultiPolygon}
        interactive={false}
        pathOptions={{
          stroke: false,
          weight: 0,
          opacity: 0,
          fill: true,
          fillColor: "#355843",
          fillOpacity: 0.28,
          fillRule: "evenodd",
        }}
      />
    </MapContainer>
  );
}
