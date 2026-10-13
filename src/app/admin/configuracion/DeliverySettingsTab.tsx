"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CarFront,
  Fuel,
  MapPin,
  Plus,
  Route,
  Save,
  Trash2,
} from "lucide-react";
import {
  DELIVERY_WEEKDAYS,
  EMPTY_BANK_ACCOUNT,
  EMPTY_DELIVERY_DISTANCE_SETTINGS,
  type AdminAppSettings,
  type DeliveryDistanceSettings,
  type DeliveryScheduleRule,
  type DeliveryVehicleSettings,
  type FuelType,
} from "@/lib/appSettings";

const SATURDAY_DELIVERY_DRAFT: DeliveryScheduleRule = {
  deliveryWeekday: 6,
  cutoffWeekday: 5,
  cutoffTime: "",
};

function cloneDistanceDefaults(): DeliveryDistanceSettings {
  return {
    ...EMPTY_DELIVERY_DISTANCE_SETTINGS,
    fuelPricesCrcPerLiter: { ...EMPTY_DELIVERY_DISTANCE_SETTINGS.fuelPricesCrcPerLiter },
    vehicles: EMPTY_DELIVERY_DISTANCE_SETTINGS.vehicles.map((vehicle) => ({ ...vehicle })),
  };
}

const EMPTY_SETTINGS: AdminAppSettings = {
  deliveryMode: "flat",
  deliveryFlatFeeCrc: null,
  deliveryDistance: cloneDistanceDefaults(),
  deliverySchedule: [{ ...SATURDAY_DELIVERY_DRAFT }],
  deliveryScheduleConfigured: false,
  sinpePhone: "",
  sinpeHolder: "",
  bankAccounts: [{ ...EMPTY_BANK_ACCOUNT }, { ...EMPTY_BANK_ACCOUNT }],
  whatsappPhone: "",
  contactEmail: "",
};

function weekdayLabel(value: number) {
  return DELIVERY_WEEKDAYS.find((day) => day.value === value)?.label ?? "Día";
}

function numberOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCrc(value: number) {
  return `₡${Math.round(value).toLocaleString("es-CR")}`;
}

function hydrateSettings(settings: AdminAppSettings): AdminAppSettings {
  const bankAccounts = [...(settings.bankAccounts ?? [])];
  while (bankAccounts.length < 2) bankAccounts.push({ ...EMPTY_BANK_ACCOUNT });

  return {
    ...EMPTY_SETTINGS,
    ...settings,
    bankAccounts: bankAccounts.slice(0, 2),
    deliveryDistance: {
      ...cloneDistanceDefaults(),
      ...(settings.deliveryDistance ?? {}),
      fuelPricesCrcPerLiter: {
        ...EMPTY_DELIVERY_DISTANCE_SETTINGS.fuelPricesCrcPerLiter,
        ...(settings.deliveryDistance?.fuelPricesCrcPerLiter ?? {}),
      },
      vehicles:
        settings.deliveryDistance?.vehicles?.length > 0
          ? settings.deliveryDistance.vehicles
          : cloneDistanceDefaults().vehicles,
    },
    deliverySchedule:
      settings.deliveryScheduleConfigured && settings.deliverySchedule.length > 0
        ? settings.deliverySchedule
        : [{ ...SATURDAY_DELIVERY_DRAFT }],
  };
}

export default function DeliverySettingsTab() {
  const [settings, setSettings] = useState<AdminAppSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [routingConfigured, setRoutingConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void loadSettings();
    void loadRoutingStatus();
  }, []);

  const activeVehicle = useMemo(
    () => settings.deliveryDistance.vehicles.find((vehicle) => vehicle.active) ?? null,
    [settings.deliveryDistance.vehicles]
  );

  const fuelPerKm = useMemo(() => {
    if (!activeVehicle?.consumptionLPer100Km) return null;
    const fuelPrice = settings.deliveryDistance.fuelPricesCrcPerLiter[activeVehicle.fuelType];
    if (fuelPrice === null || fuelPrice <= 0) return null;
    return (activeVehicle.consumptionLPer100Km / 100) * fuelPrice;
  }, [activeVehicle, settings.deliveryDistance.fuelPricesCrcPerLiter]);

  const vehicleCostPerKm =
    fuelPerKm !== null && activeVehicle?.maintenanceCrcPerKm !== null && activeVehicle?.maintenanceCrcPerKm !== undefined
      ? fuelPerKm + activeVehicle.maintenanceCrcPerKm
      : null;

  async function loadRoutingStatus() {
    try {
      const response = await fetch("/api/admin/routing/status", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      setRoutingConfigured(response.ok ? Boolean(data.configured) : false);
    } catch {
      setRoutingConfigured(false);
    }
  }

  async function loadSettings() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la configuración");
      setSettings(hydrateSettings(data as AdminAppSettings));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  }

  function updateDistance<K extends keyof DeliveryDistanceSettings>(
    key: K,
    value: DeliveryDistanceSettings[K]
  ) {
    setSettings((current) => ({
      ...current,
      deliveryDistance: { ...current.deliveryDistance, [key]: value },
    }));
    setMessage("");
  }

  function updateFuelPrice(type: FuelType, value: number | null) {
    setSettings((current) => ({
      ...current,
      deliveryDistance: {
        ...current.deliveryDistance,
        fuelPricesCrcPerLiter: {
          ...current.deliveryDistance.fuelPricesCrcPerLiter,
          [type]: value,
        },
      },
    }));
    setMessage("");
  }

  function updateVehicle(id: string, changes: Partial<DeliveryVehicleSettings>) {
    setSettings((current) => ({
      ...current,
      deliveryDistance: {
        ...current.deliveryDistance,
        vehicles: current.deliveryDistance.vehicles.map((vehicle) =>
          vehicle.id === id ? { ...vehicle, ...changes } : vehicle
        ),
      },
    }));
    setMessage("");
  }

  function setActiveVehicle(id: string) {
    setSettings((current) => ({
      ...current,
      deliveryDistance: {
        ...current.deliveryDistance,
        vehicles: current.deliveryDistance.vehicles.map((vehicle) => ({
          ...vehicle,
          active: vehicle.id === id,
        })),
      },
    }));
    setMessage("");
  }

  function addVehicle() {
    const id = `vehicle-${Date.now()}`;
    setSettings((current) => ({
      ...current,
      deliveryDistance: {
        ...current.deliveryDistance,
        vehicles: [
          ...current.deliveryDistance.vehicles,
          {
            id,
            name: "Nuevo vehículo",
            fuelType: "super",
            consumptionLPer100Km: null,
            maintenanceCrcPerKm: null,
            active: current.deliveryDistance.vehicles.length === 0,
          },
        ],
      },
    }));
    setMessage("");
  }

  function removeVehicle(id: string) {
    setSettings((current) => {
      const remaining = current.deliveryDistance.vehicles.filter((vehicle) => vehicle.id !== id);
      if (remaining.length === 0) return current;
      if (!remaining.some((vehicle) => vehicle.active)) remaining[0] = { ...remaining[0], active: true };
      return {
        ...current,
        deliveryDistance: { ...current.deliveryDistance, vehicles: remaining },
      };
    });
    setMessage("");
  }

  function toggleDeliveryDay(deliveryWeekday: number) {
    setSettings((current) => {
      const exists = current.deliverySchedule.some((rule) => rule.deliveryWeekday === deliveryWeekday);
      const deliverySchedule = exists
        ? current.deliverySchedule.filter((rule) => rule.deliveryWeekday !== deliveryWeekday)
        : [
            ...current.deliverySchedule,
            { deliveryWeekday, cutoffWeekday: (deliveryWeekday + 6) % 7, cutoffTime: "" },
          ];
      return { ...current, deliverySchedule };
    });
    setMessage("");
  }

  function updateDeliveryRule(
    deliveryWeekday: number,
    changes: Partial<Pick<DeliveryScheduleRule, "cutoffWeekday" | "cutoffTime">>
  ) {
    setSettings((current) => ({
      ...current,
      deliverySchedule: current.deliverySchedule.map((rule) =>
        rule.deliveryWeekday === deliveryWeekday ? { ...rule, ...changes } : rule
      ),
    }));
    setMessage("");
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setMessage("Este navegador no permite obtener la ubicación actual.");
      return;
    }

    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings((current) => ({
          ...current,
          deliveryDistance: {
            ...current.deliveryDistance,
            originLatitude: Number(position.coords.latitude.toFixed(7)),
            originLongitude: Number(position.coords.longitude.toFixed(7)),
          },
        }));
        setMessage("Punto de salida actualizado con la ubicación de este dispositivo.");
        setLocating(false);
      },
      () => {
        setMessage("No pudimos obtener tu ubicación. Podés escribir latitud y longitud manualmente.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryMode: settings.deliveryMode,
          deliveryFlatFeeCrc: settings.deliveryFlatFeeCrc,
          deliveryDistance: settings.deliveryDistance,
          deliverySchedule: settings.deliverySchedule,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la configuración");
      setSettings(hydrateSettings(data as AdminAppSettings));
      setMessage("Configuración de entregas guardada. Los pedidos nuevos usarán estos valores.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-tab-stack">
      <section className="admin-setting-card admin-business-card">
        <div className="admin-setting-icon" aria-hidden="true">
          <CalendarDays size={24} strokeWidth={1.8} />
        </div>
        <div className="admin-setting-content">
          <span className="admin-setting-kicker">Calendario</span>
          <h2>Días de entrega y corte</h2>
          <p>Elegí uno o varios días de entrega. Cada día puede tener su propio día y hora de corte.</p>

          {!settings.deliveryScheduleConfigured && (
            <div className="admin-setting-note">
              El calendario nuevo todavía no está guardado. Sábado aparece como borrador inicial.
            </div>
          )}

          <div className="admin-delivery-days" role="group" aria-label="Días de entrega">
            {DELIVERY_WEEKDAYS.map((day) => {
              const active = settings.deliverySchedule.some((rule) => rule.deliveryWeekday === day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  className={`admin-delivery-day${active ? " is-active" : ""}`}
                  onClick={() => toggleDeliveryDay(day.value)}
                  aria-pressed={active}
                  disabled={loading}
                >
                  {day.shortLabel}
                </button>
              );
            })}
          </div>

          <div className="admin-delivery-rules">
            {settings.deliverySchedule
              .slice()
              .sort((a, b) => {
                const order = [1, 2, 3, 4, 5, 6, 0];
                return order.indexOf(a.deliveryWeekday) - order.indexOf(b.deliveryWeekday);
              })
              .map((rule) => (
                <div className="admin-delivery-rule" key={rule.deliveryWeekday}>
                  <div className="admin-delivery-rule__day">
                    <span>Entrega</span>
                    <strong>{weekdayLabel(rule.deliveryWeekday)}</strong>
                  </div>
                  <label className="admin-business-field">
                    <span>Día de corte</span>
                    <select
                      value={rule.cutoffWeekday}
                      onChange={(event) => updateDeliveryRule(rule.deliveryWeekday, { cutoffWeekday: Number(event.target.value) })}
                      disabled={loading}
                    >
                      {DELIVERY_WEEKDAYS.map((day) => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-business-field">
                    <span>Hora de corte</span>
                    <input
                      type="time"
                      value={rule.cutoffTime}
                      onChange={(event) => updateDeliveryRule(rule.deliveryWeekday, { cutoffTime: event.target.value })}
                      disabled={loading}
                    />
                  </label>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="admin-setting-card admin-business-card">
        <div className="admin-setting-icon" aria-hidden="true">
          <Route size={24} strokeWidth={1.8} />
        </div>
        <div className="admin-setting-content">
          <span className="admin-setting-kicker">Costo de envío</span>
          <h2>Cómo se cobra cada entrega</h2>
          <p>
            Podés mantener una tarifa fija o activar el cálculo individual por distancia. El cálculo por distancia es independiente de cuántos pedidos haya ese día.
          </p>

          <div className="shipping-mode-options">
            <button
              type="button"
              className={`shipping-mode-option${settings.deliveryMode === "flat" ? " is-active" : ""}`}
              onClick={() => setSettings((current) => ({ ...current, deliveryMode: "flat" }))}
            >
              <strong>Tarifa fija</strong>
              <span>Usa el mismo monto para todos los pedidos.</span>
            </button>
            <button
              type="button"
              className={`shipping-mode-option${settings.deliveryMode === "distance" ? " is-active" : ""}`}
              onClick={() => setSettings((current) => ({ ...current, deliveryMode: "distance" }))}
            >
              <strong>Calculado por distancia</strong>
              <span>Combustible + mantenimiento + tiempo + margen.</span>
            </button>
          </div>

          {settings.deliveryMode === "flat" && (
            <div className="admin-business-subsection">
              <h3>Tarifa fija</h3>
              <div className="admin-business-fields admin-business-fields--compact">
                <label className="admin-business-field">
                  <span>Monto cobrado por envío</span>
                  <div className="admin-money-input">
                    <span>₡</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settings.deliveryFlatFeeCrc ?? ""}
                      onChange={(event) => setSettings((current) => ({
                        ...current,
                        deliveryFlatFeeCrc: numberOrNull(event.target.value),
                      }))}
                      placeholder="Ej: 1500"
                    />
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="admin-business-subsection">
            <div className="settings-section-heading">
              <div>
                <h3>Punto de salida</h3>
                <p>Es el lugar desde el que se calcula el recorrido individual de ida y regreso.</p>
              </div>
              <button type="button" className="admin-setting-button admin-setting-button--secondary" onClick={useCurrentLocation} disabled={locating}>
                <MapPin size={17} />
                {locating ? "Ubicando..." : "Usar mi ubicación actual"}
              </button>
            </div>
            <div className="admin-business-fields">
              <label className="admin-business-field">
                <span>Latitud</span>
                <input
                  type="number"
                  step="0.0000001"
                  value={settings.deliveryDistance.originLatitude ?? ""}
                  onChange={(event) => updateDistance("originLatitude", numberOrNull(event.target.value))}
                  placeholder="Ej: 10.0162500"
                />
              </label>
              <label className="admin-business-field">
                <span>Longitud</span>
                <input
                  type="number"
                  step="0.0000001"
                  value={settings.deliveryDistance.originLongitude ?? ""}
                  onChange={(event) => updateDistance("originLongitude", numberOrNull(event.target.value))}
                  placeholder="Ej: -84.2149000"
                />
              </label>
            </div>
          </div>

          <div className="admin-business-subsection">
            <div className="settings-section-heading">
              <div>
                <h3>Vehículos</h3>
                <p>El vehículo marcado como activo es el que se usa para los pedidos nuevos.</p>
              </div>
              <button type="button" className="admin-setting-button admin-setting-button--secondary" onClick={addVehicle}>
                <Plus size={17} />
                Agregar vehículo
              </button>
            </div>

            <div className="delivery-vehicles">
              {settings.deliveryDistance.vehicles.map((vehicle) => (
                <article className={`delivery-vehicle-card${vehicle.active ? " is-active" : ""}`} key={vehicle.id}>
                  <div className="delivery-vehicle-card__header">
                    <label className="delivery-vehicle-active">
                      <input
                        type="radio"
                        name="active-delivery-vehicle"
                        checked={vehicle.active}
                        onChange={() => setActiveVehicle(vehicle.id)}
                      />
                      <CarFront size={18} />
                      <span>{vehicle.active ? "Vehículo activo" : "Usar este vehículo"}</span>
                    </label>
                    {settings.deliveryDistance.vehicles.length > 1 && (
                      <button type="button" className="delivery-vehicle-delete" onClick={() => removeVehicle(vehicle.id)} aria-label={`Eliminar ${vehicle.name}`}>
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>

                  <div className="admin-business-fields delivery-vehicle-fields">
                    <label className="admin-business-field">
                      <span>Nombre</span>
                      <input value={vehicle.name} onChange={(event) => updateVehicle(vehicle.id, { name: event.target.value })} />
                    </label>
                    <label className="admin-business-field">
                      <span>Combustible</span>
                      <select value={vehicle.fuelType} onChange={(event) => updateVehicle(vehicle.id, { fuelType: event.target.value as FuelType })}>
                        <option value="super">Súper</option>
                        <option value="regular">Regular</option>
                        <option value="diesel">Diésel</option>
                      </select>
                    </label>
                    <label className="admin-business-field">
                      <span>Consumo (L / 100 km)</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={vehicle.consumptionLPer100Km ?? ""}
                        onChange={(event) => updateVehicle(vehicle.id, { consumptionLPer100Km: numberOrNull(event.target.value) })}
                        placeholder="Ej: 13.4"
                      />
                    </label>
                    <label className="admin-business-field">
                      <span>Mantenimiento / desgaste por km</span>
                      <div className="admin-money-input">
                        <span>₡</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={vehicle.maintenanceCrcPerKm ?? ""}
                          onChange={(event) => updateVehicle(vehicle.id, { maintenanceCrcPerKm: numberOrNull(event.target.value) })}
                          placeholder="Pendiente de calcular"
                        />
                      </div>
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="admin-business-subsection">
            <h3>Combustible y mano de obra</h3>
            <div className="admin-business-fields settings-cost-grid">
              {(["super", "regular", "diesel"] as FuelType[]).map((type) => (
                <label className="admin-business-field" key={type}>
                  <span>Precio {type === "super" ? "Súper" : type === "regular" ? "Regular" : "Diésel"} / litro</span>
                  <div className="admin-money-input">
                    <span>₡</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settings.deliveryDistance.fuelPricesCrcPerLiter[type] ?? ""}
                      onChange={(event) => updateFuelPrice(type, numberOrNull(event.target.value))}
                    />
                  </div>
                </label>
              ))}
              <label className="admin-business-field">
                <span>Pago por hora de entrega</span>
                <div className="admin-money-input">
                  <span>₡</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settings.deliveryDistance.laborRateCrcPerHour ?? ""}
                    onChange={(event) => updateDistance("laborRateCrcPerHour", numberOrNull(event.target.value))}
                  />
                </div>
                <small>Este monto es costo de mano de obra del negocio, no utilidad.</small>
              </label>
            </div>
          </div>

          <div className="admin-business-subsection">
            <h3>Ruta y duración</h3>
            <div className={`admin-routing-status${routingConfigured === true ? " is-ready" : ""}`}>
              <div>
                <strong>OpenRouteService</strong>
                <span>
                  {routingConfigured === null
                    ? "Revisando configuración..."
                    : routingConfigured
                      ? "Configurado. Los pedidos usan distancia y duración reales por carretera."
                      : "Falta la variable OPENROUTESERVICE_API_KEY en el servidor."}
                </span>
              </div>
              <span className="admin-routing-status__badge">
                {routingConfigured === null ? "..." : routingConfigured ? "Listo" : "Pendiente"}
              </span>
            </div>
            <p className="admin-business-help">
              OpenRouteService calcula automáticamente la distancia y la duración por carretera. No necesitás configurar velocidades ni factores de distancia manualmente.
            </p>
            <div className="admin-business-fields">
              <label className="admin-business-field">
                <span>Tiempo por parada</span>
                <div className="admin-unit-input">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settings.deliveryDistance.stopMinutes ?? ""}
                    onChange={(event) => updateDistance("stopMinutes", numberOrNull(event.target.value))}
                    placeholder="Ej: 5"
                  />
                  <span>min</span>
                </div>
                <small>Tiempo adicional para estacionar, bajar el pedido, entregar y confirmar.</small>
              </label>
            </div>
          </div>

          <div className="admin-business-subsection">
            <h3>Política de cobro</h3>
            <div className="admin-business-fields">
              <label className="admin-business-field">
                <span>Margen adicional sobre el costo</span>
                <div className="admin-unit-input">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.deliveryDistance.marginPercent}
                    onChange={(event) => updateDistance("marginPercent", Number(event.target.value) || 0)}
                  />
                  <span>%</span>
                </div>
                <small>0% significa cobrar únicamente el costo estimado.</small>
              </label>
              <label className="admin-business-field">
                <span>Envío mínimo</span>
                <div className="admin-money-input">
                  <span>₡</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={settings.deliveryDistance.minimumShippingCrc}
                    onChange={(event) => updateDistance("minimumShippingCrc", Math.max(0, Number(event.target.value) || 0))}
                  />
                </div>
                <small>La tarifa calculada nunca bajará de este monto. Inicialmente: ₡1.500.</small>
              </label>
              <label className="admin-business-field">
                <span>Redondear hacia arriba a</span>
                <div className="admin-money-input">
                  <span>₡</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={settings.deliveryDistance.roundingCrc}
                    onChange={(event) => updateDistance("roundingCrc", Number(event.target.value) || 100)}
                  />
                </div>
                <small>Ejemplo: con ₡100, ₡1.841 se cobra como ₡1.900.</small>
              </label>
            </div>
          </div>

          <div className="delivery-cost-preview">
            <div className="delivery-cost-preview__icon"><Fuel size={20} /></div>
            <div>
              <span>Vehículo activo</span>
              <strong>{activeVehicle?.name ?? "Sin vehículo"}</strong>
              <p>
                {fuelPerKm === null
                  ? "Completa el consumo y el precio del combustible para calcular el costo de gasolina por km."
                  : `Gasolina estimada: ${formatCrc(fuelPerKm)}/km${vehicleCostPerKm !== null ? ` · Vehículo con mantenimiento: ${formatCrc(vehicleCostPerKm)}/km` : ""}.`}
              </p>
            </div>
          </div>

          {message && <div className="admin-setting-message">{message}</div>}

          <div className="admin-setting-actions">
            <button type="button" className="admin-setting-button" onClick={() => void saveSettings()} disabled={loading || saving}>
              <Save size={18} />
              {saving ? "Guardando..." : "Guardar entregas"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
