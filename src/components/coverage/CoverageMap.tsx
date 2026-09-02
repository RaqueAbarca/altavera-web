"use client";

import dynamic from "next/dynamic";

const CoverageMapClient = dynamic(
  () => import("./CoverageMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="coverage-map-loading">
        Cargando mapa de cobertura...
      </div>
    ),
  }
);

export default function CoverageMap() {
  return <CoverageMapClient />;
}
