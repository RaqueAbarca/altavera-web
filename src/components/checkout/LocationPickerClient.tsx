"use client";

import {
  MapContainer,
  Marker,
  Polygon,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DELIVERY_COVERAGE_ZONES,
  DELIVERY_UNAVAILABLE_MESSAGE,
  getCoverageDisplayPolygon,
  pointInPolygon,
  toLeafletLatLngs,
  type DeliveryAvailability,
  type LngLat,
} from "@/lib/deliveryCoverage";
import type { DeliveryZoneType } from "@/lib/deliveryZones";
import AltaveraMapLayer from "@/components/map/AltaveraMapLayer";

const markerIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});


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

type Position = [number, number];

type Props = {
  onChange: (
    lat: number,
    lng: number,
    availability: DeliveryAvailability
  ) => void;
};

type LocationMarkerProps = {
  position: Position | null;
  onSelect: (lat: number, lng: number) => void;
};

function LocationMarker({
  position,
  onSelect,
}: LocationMarkerProps) {
  const map = useMap();

  useMapEvents({
    click(event) {
      onSelect(
        event.latlng.lat,
        event.latlng.lng
      );
    },
  });

  useEffect(() => {
    if (position) {
      map.panTo(position);
    }
  }, [position, map]);

  if (!position) {
    return null;
  }

  return (
    <Marker
      position={position}
      icon={markerIcon}
    />
  );
}

type LocateButtonProps = {
  onSelect: (lat: number, lng: number) => void;
};

function LocateButton({
  onSelect,
}: LocateButtonProps) {
  const map = useMap();

  function locate() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        onSelect(lat, lng);
        map.flyTo([lat, lng], 15);
      },
      () => {
        alert(
          "No se pudo obtener tu ubicación. Puedes seleccionar el punto manualmente en el mapa."
        );
      }
    );
  }

  return (
    <button
      type="button"
      className="locate-btn"
      onClick={locate}
    >
      Usar mi ubicación
    </button>
  );
}

async function checkDeliveryAvailability(
  latitude: number,
  longitude: number
): Promise<DeliveryAvailability> {
  const response = await fetch(
    "/api/delivery/check",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude,
        longitude,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? "No se pudo validar la ubicación"
    );
  }

  return {
    available: Boolean(data.available),
    status: data.available
      ? "covered"
      : "outside",
    zone:
      data.available && typeof data.zone === "string"
        ? data.zone
        : null,
  };
}

export default function LocationPickerClient({
  onChange,
}: Props) {
  const [position, setPosition] =
    useState<Position | null>(null);
  const [availability, setAvailability] =
    useState<DeliveryAvailability | null>(null);
  const [checking, setChecking] = useState(false);
  const [validationError, setValidationError] =
    useState("");
  const requestIdRef = useRef(0);

  const [coverageZones, setCoverageZones] =
    useState<PublicDeliveryZone[]>(fallbackZones);

  const coverageMultiPolygon = useMemo(
    () => buildCoveragePolygons(coverageZones),
    [coverageZones]
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/delivery/zones", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo cargar la cobertura");
        return response.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.zones)) {
          setCoverageZones(data.zones);
        }
      })
      .catch(() => {
        // Mantiene la cobertura estática si la API no está disponible.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function selectLocation(
    lat: number,
    lng: number
  ) {
    const requestId = ++requestIdRef.current;

    setPosition([lat, lng]);
    setAvailability(null);
    setValidationError("");
    setChecking(true);

    try {
      const nextAvailability =
        await checkDeliveryAvailability(lat, lng);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setAvailability(nextAvailability);
      onChange(lat, lng, nextAvailability);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const unavailable: DeliveryAvailability = {
        available: false,
        status: "outside",
        zone: null,
      };

      setAvailability(unavailable);
      setValidationError(
        error instanceof Error
          ? error.message
          : "No se pudo validar la ubicación"
      );
      onChange(lat, lng, unavailable);
    } finally {
      if (requestId === requestIdRef.current) {
        setChecking(false);
      }
    }
  }

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void selectLocation(
          pos.coords.latitude,
          pos.coords.longitude
        );
      },
      () => {
        // Si no comparte ubicación, puede marcarla manualmente.
      }
    );
  }, []);

  return (
    <div className="map-wrapper">
      <div className="map-title">
        Selecciona tu ubicación de entrega
      </div>

      <MapContainer
        center={[10.016,-84.214]}
        zoom={14}
        scrollWheelZoom
        className="checkout-map"
      >
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
            fillOpacity: 0.12,
            fillRule: "evenodd",
          }}
        />

        <LocationMarker
          position={position}
          onSelect={(lat, lng) => {
            void selectLocation(lat, lng);
          }}
        />

        <LocateButton
          onSelect={(lat, lng) => {
            void selectLocation(lat, lng);
          }}
        />
      </MapContainer>

      <div
        className={`coverage-status ${
          availability?.available
            ? "coverage-status--available"
            : availability
              ? "coverage-status--unavailable"
              : "coverage-status--neutral"
        }`}
      >
        {checking && "Validando ubicación..."}

        {!checking &&
          validationError && (
            <strong>
              No pudimos validar esta ubicación. Intenta
              seleccionar el punto nuevamente.
            </strong>
          )}

        {!checking &&
          !validationError &&
          !availability &&
          "Marca tu ubicación en el mapa para confirmar si realizamos entregas."}

        {!checking &&
          !validationError &&
          availability?.available && (
            <>
              <strong>
                Ubicación dentro de cobertura.
              </strong>
              {availability.zone
                ? ` Zona: ${availability.zone}.`
                : ""}
            </>
          )}

        {!checking &&
          !validationError &&
          availability &&
          !availability.available && (
            <strong>
              {DELIVERY_UNAVAILABLE_MESSAGE}
            </strong>
          )}
      </div>
    </div>
  );
}
