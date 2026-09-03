"use client";

import "../admin.css";
import "./cobertura.css";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LngLat } from "@/lib/deliveryCoverage";
import type { DeliveryZoneType } from "@/lib/deliveryZones";
import AltaveraMapLayer from "@/components/map/AltaveraMapLayer";

type ZoneRow = {
  id: string;
  name: string;
  zone_type: DeliveryZoneType;
  polygon: LngLat[];
  enabled: boolean;
  sort_order: number;
};

type DrawMode = "idle" | "include" | "exclude";

const vertexIcon = L.divIcon({
  className: "coverage-vertex-icon",
  html: '<span aria-hidden="true"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function toLatLngs(polygon: LngLat[]) {
  return polygon.map(([lng, lat]) => [lat, lng] as [number, number]);
}

function MapClickHandler({ enabled, onPoint }: { enabled: boolean; onPoint: (point: LngLat) => void }) {
  useMapEvents({
    click(event) {
      if (enabled) onPoint([event.latlng.lng, event.latlng.lat]);
    },
  });
  return null;
}

export default function CoverageAdminPage() {
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [drawMode, setDrawMode] = useState<DrawMode>("idle");
  const [draftPoints, setDraftPoints] = useState<LngLat[]>([]);
  const [draftName, setDraftName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPolygon, setEditPolygon] = useState<LngLat[]>([]);
  const [addingVertex, setAddingVertex] = useState(false);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedId) ?? null,
    [zones, selectedId]
  );

  async function loadZones() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/delivery-zones", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la cobertura");
      setZones(data.zones ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la cobertura");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadZones();
  }, []);

  function selectZone(zone: ZoneRow) {
    setDrawMode("idle");
    setDraftPoints([]);
    setDraftName("");
    setSelectedId(zone.id);
    setEditName(zone.name);
    setEditPolygon(zone.polygon.map((point) => [...point] as LngLat));
    setMessage("");
    setError("");
    setAddingVertex(false);
  }

  function startDrawing(type: DeliveryZoneType) {
    setSelectedId(null);
    setDrawMode(type);
    setDraftPoints([]);
    setDraftName("");
    setMessage("");
    setError("");
    setAddingVertex(false);
  }

  async function createZone() {
    if (!draftName.trim()) {
      setError("Ponle un nombre a la zona antes de guardarla.");
      return;
    }
    if (draftPoints.length < 3) {
      setError("Dibuja al menos 3 puntos para cerrar la zona.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/delivery-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName, type: drawMode, polygon: draftPoints, enabled: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la zona");
      setDrawMode("idle");
      setDraftPoints([]);
      setDraftName("");
      setMessage("Zona guardada. El checkout ya usará este cambio.");
      await loadZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la zona");
    } finally {
      setSaving(false);
    }
  }

  async function updateSelected(changes?: Partial<{ name: string; polygon: LngLat[]; enabled: boolean }>) {
    if (!selectedZone) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/delivery-zones/${encodeURIComponent(selectedZone.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes ?? { name: editName, polygon: editPolygon }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron guardar los cambios");
      const updated = data.zone as ZoneRow;
      setZones((current) => current.map((zone) => zone.id === updated.id ? updated : zone));
      setEditName(updated.name);
      setEditPolygon(updated.polygon);
      setMessage("Cambios guardados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!selectedZone) return;
    const confirmed = window.confirm(`¿Eliminar la zona “${selectedZone.name}”? Esta acción cambia la cobertura inmediatamente.`);
    if (!confirmed) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/delivery-zones/${encodeURIComponent(selectedZone.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo eliminar la zona");
      setZones((current) => current.filter((zone) => zone.id !== selectedZone.id));
      setSelectedId(null);
      setEditPolygon([]);
      setEditName("");
      setMessage("Zona eliminada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la zona");
    } finally {
      setSaving(false);
    }
  }

  function updateVertex(index: number, point: LngLat) {
    setEditPolygon((current) => current.map((item, itemIndex) => itemIndex === index ? point : item));
  }

  function removeVertex(index: number) {
    setEditPolygon((current) => current.length <= 3 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addVertexNearEdge(point: LngLat) {
    if (editPolygon.length < 2) return;
    const distanceToSegment = (p: LngLat, a: LngLat, b: LngLat) => {
      const vx = b[0] - a[0];
      const vy = b[1] - a[1];
      const wx = p[0] - a[0];
      const wy = p[1] - a[1];
      const lengthSquared = vx * vx + vy * vy;
      const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / lengthSquared));
      const dx = p[0] - (a[0] + t * vx);
      const dy = p[1] - (a[1] + t * vy);
      return dx * dx + dy * dy;
    };
    let nearestEdge = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    editPolygon.forEach((start, index) => {
      const end = editPolygon[(index + 1) % editPolygon.length];
      const distance = distanceToSegment(point, start, end);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEdge = index;
      }
    });
    setEditPolygon((current) => [
      ...current.slice(0, nearestEdge + 1),
      point,
      ...current.slice(nearestEdge + 1),
    ]);
    setAddingVertex(false);
  }

  return (
    <main className="admin-container coverage-admin">
      <header className="admin-page-header coverage-admin-header">
        <div>
          <h1>Cobertura de entregas</h1>
          <p>Dibuja las zonas donde Altavera entrega y recorta sectores específicos sin editar coordenadas.</p>
        </div>
        <a className="coverage-back-link" href="/admin/dashboard">Volver al panel</a>
      </header>

      <div className="coverage-toolbar">
        <button type="button" className="coverage-add-button" onClick={() => startDrawing("include")}>+ Agregar cobertura</button>
        <button type="button" className="coverage-exclude-button" onClick={() => startDrawing("exclude")}>− Excluir zona</button>
      </div>

      {error && <div className="coverage-feedback coverage-feedback--error">{error}</div>}
      {message && <div className="coverage-feedback coverage-feedback--success">{message}</div>}

      <section className="coverage-editor-layout">
        <div className="coverage-map-card">
          <MapContainer center={[10.016,-84.214]} zoom={13} scrollWheelZoom className="coverage-admin-map">
            <AltaveraMapLayer />
            <MapClickHandler
              enabled={drawMode !== "idle" || Boolean(selectedZone && addingVertex)}
              onPoint={(point) => {
                if (drawMode !== "idle") setDraftPoints((current) => [...current, point]);
                else if (selectedZone && addingVertex) addVertexNearEdge(point);
              }}
            />

            {zones.map((zone) => {
              const isSelected = zone.id === selectedId;
              const polygon = isSelected ? editPolygon : zone.polygon;
              return (
                <Polygon
                  key={zone.id}
                  positions={toLatLngs(polygon)}
                  eventHandlers={{ click: () => { if (drawMode === "idle" && !addingVertex) selectZone(zone); } }}
                  pathOptions={{
                    color: zone.zone_type === "exclude" ? "#9f3030" : "#28533a",
                    weight: isSelected ? 4 : 2,
                    fillColor: zone.zone_type === "exclude" ? "#b64545" : "#355843",
                    fillOpacity: zone.enabled ? (zone.zone_type === "exclude" ? 0.32 : 0.2) : 0.05,
                    opacity: zone.enabled ? 0.9 : 0.35,
                    dashArray: zone.enabled ? undefined : "7 7",
                  }}
                />
              );
            })}

            {drawMode !== "idle" && draftPoints.length > 0 && (
              <Polyline positions={toLatLngs(draftPoints)} pathOptions={{ color: drawMode === "exclude" ? "#9f3030" : "#28533a", weight: 3, dashArray: "7 7" }} />
            )}
            {drawMode !== "idle" && draftPoints.length >= 3 && (
              <Polygon positions={toLatLngs(draftPoints)} pathOptions={{ color: drawMode === "exclude" ? "#9f3030" : "#28533a", fillColor: drawMode === "exclude" ? "#b64545" : "#355843", fillOpacity: 0.18 }} />
            )}
            {drawMode !== "idle" && draftPoints.map(([lng, lat], index) => (
              <Marker key={`draft-${index}`} position={[lat, lng]} icon={vertexIcon} interactive={false} />
            ))}

            {selectedZone && editPolygon.map(([lng, lat], index) => (
              <Marker
                key={`${selectedZone.id}-${index}`}
                position={[lat, lng]}
                icon={vertexIcon}
                draggable
                eventHandlers={{
                  dragend(event) {
                    const marker = event.target as L.Marker;
                    const point = marker.getLatLng();
                    updateVertex(index, [point.lng, point.lat]);
                  },
                  contextmenu() { removeVertex(index); },
                }}
              />
            ))}
          </MapContainer>

          <div className="coverage-map-help">
            {drawMode !== "idle"
              ? "Haz clic alrededor del área que quieres dibujar. No necesitas cerrar el polígono manualmente."
              : selectedZone && addingVertex
                ? "Haz clic cerca del borde donde quieres agregar un vértice nuevo."
                : selectedZone
                  ? "Arrastra los puntos blancos para mover el límite. Clic derecho sobre un punto para eliminarlo."
                : "Selecciona una zona existente para editarla o crea una nueva desde los botones de arriba."}
          </div>
        </div>

        <aside className="coverage-side-panel">
          {drawMode !== "idle" ? (
            <div className="coverage-edit-card">
              <span className={`coverage-type-badge coverage-type-badge--${drawMode}`}>{drawMode === "include" ? "Nueva cobertura" : "Nueva exclusión"}</span>
              <label>Nombre interno<input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={drawMode === "include" ? "Ej. Río Segundo" : "Ej. Zona operativa 1"} /></label>
              <p>{draftPoints.length} puntos dibujados</p>
              <div className="coverage-edit-actions">
                <button type="button" disabled={draftPoints.length === 0 || saving} onClick={() => setDraftPoints((current) => current.slice(0, -1))}>Deshacer punto</button>
                <button type="button" disabled={saving} onClick={() => { setDrawMode("idle"); setDraftPoints([]); setDraftName(""); }}>Cancelar</button>
                <button type="button" className="coverage-primary-action" disabled={draftPoints.length < 3 || saving} onClick={() => void createZone()}>{saving ? "Guardando…" : "Guardar zona"}</button>
              </div>
            </div>
          ) : selectedZone ? (
            <div className="coverage-edit-card">
              <span className={`coverage-type-badge coverage-type-badge--${selectedZone.zone_type}`}>{selectedZone.zone_type === "include" ? "Cobertura" : "Exclusión"}</span>
              <label>Nombre<input value={editName} onChange={(event) => setEditName(event.target.value)} /></label>
              <p>{editPolygon.length} puntos · {selectedZone.enabled ? "Activa" : "Desactivada"}</p>
              <div className="coverage-edit-actions">
                <button type="button" disabled={saving} onClick={() => setAddingVertex((current) => !current)}>{addingVertex ? "Cancelar nuevo punto" : "+ Agregar punto al borde"}</button>
                <button type="button" disabled={saving} onClick={() => void updateSelected({ enabled: !selectedZone.enabled })}>{selectedZone.enabled ? "Desactivar" : "Activar"}</button>
                <button type="button" className="coverage-primary-action" disabled={editPolygon.length < 3 || saving} onClick={() => void updateSelected()}>{saving ? "Guardando…" : "Guardar cambios"}</button>
                <button type="button" className="coverage-danger-action" disabled={saving} onClick={() => void deleteSelected()}>Eliminar zona</button>
              </div>
            </div>
          ) : (
            <div className="coverage-edit-card coverage-edit-card--empty">
              <h2>Zonas</h2>
              <p>Selecciona una zona de la lista para modificar sus límites.</p>
            </div>
          )}

          <div className="coverage-zone-list">
            <h2>Zonas actuales</h2>
            {loading && <p>Cargando…</p>}
            {!loading && zones.length === 0 && <p>No hay zonas creadas.</p>}
            {zones.map((zone) => (
              <button key={zone.id} type="button" className={`coverage-zone-item ${selectedId === zone.id ? "coverage-zone-item--selected" : ""}`} onClick={() => selectZone(zone)}>
                <span><strong>{zone.name}</strong><small>{zone.zone_type === "include" ? "Cobertura" : "Exclusión"}</small></span>
                <span className={zone.enabled ? "coverage-zone-status coverage-zone-status--on" : "coverage-zone-status"}>{zone.enabled ? "Activa" : "Off"}</span>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
