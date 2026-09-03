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
  onRequestLocation: () => void;
};

function LocateButton({
  onRequestLocation,
}: LocateButtonProps) {
  return (
    <button
      type="button"
      className="locate-btn"
      onClick={onRequestLocation}
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
  const [showLocationIntro, setShowLocationIntro] =
    useState(true);
  const [locationPermissionError, setLocationPermissionError] =
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

  function requestCurrentLocation() {
    setLocationPermissionError("");
    setShowLocationIntro(false);

    if (!("geolocation" in navigator)) {
      setLocationPermissionError(
        "Tu navegador no permite obtener la ubicación automáticamente. Puedes marcarla manualmente en el mapa."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void selectLocation(
          pos.coords.latitude,
          pos.coords.longitude
        );
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermissionError(
            "No se concedió el permiso de ubicación. Puedes intentarlo de nuevo o marcar tu ubicación manualmente en el mapa."
          );
          return;
        }

        setLocationPermissionError(
          "No pudimos obtener tu ubicación automáticamente. Puedes marcarla manualmente en el mapa."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }

  return (
    <div className="map-wrapper">
      {showLocationIntro && (
        <div
          className="location-intro-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLocationIntro(false);
            }
          }}
        >
          <section
            className="location-intro-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-intro-title"
            aria-describedby="location-intro-description"
          >
            <div className="location-intro-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
            </div>

            <h2 id="location-intro-title">
              Necesitamos tu ubicación de entrega
            </h2>

            <p id="location-intro-description">
              La usaremos para colocar tu pedido en el punto correcto y confirmar que la dirección está dentro de nuestra zona de entrega.
            </p>

            <div className="location-intro-note">
              Al continuar, tu navegador te pedirá permiso para compartir tu ubicación. Para detectarla automáticamente, selecciona <strong>Permitir</strong> cuando aparezca el aviso.
            </div>

            <div className="location-intro-actions">
              <button
                type="button"
                className="location-intro-primary"
                onClick={requestCurrentLocation}
              >
                Compartir mi ubicación
              </button>

              <button
                type="button"
                className="location-intro-secondary"
                onClick={() => {
                  setShowLocationIntro(false);
                }}
              >
                Elegirla manualmente
              </button>
            </div>

            <small>
              La ubicación se utiliza únicamente para gestionar esta entrega.
            </small>
          </section>
        </div>
      )}

      <div className="map-title">
        Selecciona tu ubicación de entrega
      </div>

      <MapContainer
        center={[10.016, -84.214]}
        zoom={13}
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
          onRequestLocation={() => {
            setShowLocationIntro(true);
          }}
        />
      </MapContainer>

      {locationPermissionError && (
        <div className="location-permission-error">
          {locationPermissionError}
        </div>
      )}

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

      <style jsx>{`
        .location-intro-backdrop {
          position: fixed;
          inset: 0;
          z-index: 5000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(24, 37, 29, 0.42);
          backdrop-filter: blur(5px);
        }

        .location-intro-card {
          width: min(100%, 440px);
          padding: 30px;
          border: 1px solid rgba(31, 64, 42, 0.09);
          border-radius: 24px;
          background: #fffdf9;
          box-shadow: 0 24px 70px rgba(31, 64, 42, 0.2);
          text-align: center;
        }

        .location-intro-icon {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          margin: 0 auto 18px;
          border-radius: 18px;
          background: #e9efe9;
          color: #355843;
        }

        .location-intro-icon svg {
          width: 29px;
          height: 29px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .location-intro-card h2 {
          margin: 0;
          color: #1f402a;
          font-size: clamp(1.35rem, 4vw, 1.7rem);
          line-height: 1.15;
        }

        .location-intro-card p {
          margin: 13px 0 0;
          color: #626b64;
          font-size: 0.96rem;
          line-height: 1.55;
        }

        .location-intro-note {
          margin-top: 18px;
          padding: 13px 14px;
          border-radius: 14px;
          background: #f2f5f0;
          color: #536056;
          font-size: 0.86rem;
          line-height: 1.5;
          text-align: left;
        }

        .location-intro-actions {
          display: grid;
          gap: 9px;
          margin-top: 20px;
        }

        .location-intro-actions button {
          min-height: 47px;
          padding: 11px 16px;
          border-radius: 13px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        .location-intro-primary {
          border: 1px solid #355843;
          background: #355843;
          color: white;
        }

        .location-intro-primary:hover {
          background: #294a36;
        }

        .location-intro-secondary {
          border: 1px solid #dfe5dd;
          background: transparent;
          color: #355843;
        }

        .location-intro-secondary:hover {
          background: #f4f6f2;
        }

        .location-intro-card small {
          display: block;
          margin-top: 15px;
          color: #899089;
          font-size: 0.73rem;
          line-height: 1.4;
        }

        .location-permission-error {
          margin-top: 10px;
          padding: 11px 13px;
          border: 1px solid #ead5d2;
          border-radius: 12px;
          background: #fbf2f0;
          color: #87493f;
          font-size: 0.86rem;
          line-height: 1.45;
        }

        @media (max-width: 520px) {
          .location-intro-backdrop {
            align-items: end;
            padding: 12px;
          }

          .location-intro-card {
            padding: 24px 20px 20px;
            border-radius: 22px;
          }
        }
      `}</style>
    </div>
  );
}
