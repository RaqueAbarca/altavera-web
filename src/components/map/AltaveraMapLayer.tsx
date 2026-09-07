"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { ALTAVERA_MAP_STYLE_URL } from "@/lib/mapConfig";

const FALLBACK_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function supportsWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
      depth: true,
      stencil: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    });

    if (!context) return false;

    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Fondo cartográfico global de Altavera.
 * Usa OpenFreeMap + MapLibre cuando WebGL está disponible.
 * Si el navegador no puede crear WebGL, cae a tiles raster de
 * OpenStreetMap para evitar que la página completa se rompa.
 */
export default function AltaveraMapLayer() {
  const map = useMap();

  useEffect(() => {
    let layer: L.Layer;

    if (supportsWebGL2()) {
      layer = maplibreGL({
        style: ALTAVERA_MAP_STYLE_URL,
      });
    } else {
      layer = L.tileLayer(FALLBACK_TILE_URL, {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
    }

    layer.addTo(map);

    return () => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    };
  }, [map]);

  return null;
}
