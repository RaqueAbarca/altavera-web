"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { ALTAVERA_MAP_STYLE_URL } from "@/lib/mapConfig";

/**
 * Fondo cartográfico global de Altavera.
 * Todos los MapContainer del proyecto deben usar este componente
 * en lugar de declarar TileLayer/proveedor por separado.
 */
export default function AltaveraMapLayer() {
  const map = useMap();

  useEffect(() => {
  const layer=maplibreGL({
    style:ALTAVERA_MAP_STYLE_URL,
  });

    layer.addTo(map);

    return () => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    };
  }, [map]);

  return null;
}
