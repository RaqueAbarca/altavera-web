"use client";

import dynamic from "next/dynamic";


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
    lng: number
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