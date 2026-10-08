"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Polygon, useMap } from "react-leaflet";
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
      const overlaps = exclusion.polygon.some((point) =>
        pointInPolygon(point[0], point[1], zone.polygon)
      );
      if (overlaps) rings.push(toLeafletLatLngs(exclusion.polygon));
    }
    return rings;
  });
}

function FitCoverageBounds({ zones }: { zones: PublicDeliveryZone[] }) {
  const map = useMap();

  useEffect(() => {
    const points = zones
      .filter((zone) => zone.type === "include")
      .flatMap((zone) => zone.polygon)
      .map(([lng, lat]) => L.latLng(lat, lng));

    if (points.length < 3) return;

    const bounds = L.latLngBounds(points);
    if (!bounds.isValid()) return;

    map.fitBounds(bounds, {
      padding: [24, 24],
      maxZoom: 14,
      animate: false,
    });
  }, [map, zones]);

  return null;
}

export default function CoverageMapClient() {
  const [zones, setZones] = useState<PublicDeliveryZone[]>(fallbackZones);

  useEffect(() => {
    let cancelled = false;

    async function loadZones() {
      try {
        const response = await fetch(`/api/delivery/zones?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("No se pudo cargar la cobertura");
        const data = await response.json();
        if (!cancelled && Array.isArray(data.zones)) setZones(data.zones);
      } catch {
        // Si la API falla, se conserva la cobertura estática de respaldo.
      }
    }

    void loadZones();
    const onFocus = () => void loadZones();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const coverageMultiPolygon = useMemo(() => buildCoveragePolygons(zones), [zones]);

  return (
    <MapContainer
      center={[10.016, -84.214]}
      zoom={13}
      scrollWheelZoom
      className="coverage-map altavera-public-map"
    >
      <AltaveraMapLayer />
      <FitCoverageBounds zones={zones} />
      {coverageMultiPolygon.length > 0 && (
        <Polygon
          positions={coverageMultiPolygon}
          interactive={false}
          pathOptions={{
            color: "#28533a",
            weight: 2,
            opacity: 0.9,
            fill: true,
            fillColor: "#355843",
            fillOpacity: 0.2,
            fillRule: "evenodd",
          }}
        />
      )}
    </MapContainer>
  );
}
