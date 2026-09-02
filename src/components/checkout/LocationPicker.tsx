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
    availability: DeliveryAvailability
  ) => void;
};

export default function LocationPicker({
  onChange,
}: Props) {
  return (
    <LocationPickerClient
      onChange={onChange}
    />
  );
}
