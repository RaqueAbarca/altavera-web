"use client";

import dynamic from "next/dynamic";

const CoverageAdminClient = dynamic(
  () => import("./CoverageAdminClient"),
  {
    ssr: false,
    loading: () => (
      <main className="admin-container coverage-admin">
        <div className="coverage-map-loading">
          Cargando editor de cobertura...
        </div>
      </main>
    ),
  }
);

export default function CoverageAdminPage() {
  return <CoverageAdminClient />;
}
