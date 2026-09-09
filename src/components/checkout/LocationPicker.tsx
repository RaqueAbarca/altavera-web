"use client";

import dynamic from "next/dynamic";
import type { DeliveryAvailability } from "@/lib/deliveryCoverage";

const LocationPickerClient = dynamic(
  () => import("./LocationPickerClient"),
  {
    ssr: false,
    loading: () => (
      <div className="map-loading">
        Cargando mapa...
      </div>
    ),
  }
);

type Props = {
  onChange: (
    lat: number,
    lng: number,
    availability: DeliveryAvailability | null
  ) => void;
  value?: { lat: number; lng: number } | null;
  autoLocate?: boolean;
};

export default function LocationPicker({
  onChange,
  value = null,
  autoLocate = true,
}: Props) {
  return (
    <LocationPickerClient
      onChange={onChange}
      value={value}
      autoLocate={autoLocate}
    />
  );
}
