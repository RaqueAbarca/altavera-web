"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Truck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { buildOrderOnTheWayMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import DeliveryMap, {
  type DeliveryMapOrder,
} from "@/components/admin/DeliveryMap";
import {
  formatDeliveryDate,
  formatDeliveryDateShort,
  getCostaRicaDateKey,
} from "@/lib/deliverySchedule";
import "../admin.css";
import "./entregas.css";

type DeliveryOrder = {
  id: string;
  guest_name: string;
  guest_phone: string;
  total: number | string;
  status: string;
  created_at: string;
  customer_notes: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  address_description: string | null;
  delivery_cycle_id: string | null;
};

type DeliveryCycle = {
  id: string;
  delivery_date: string;
  cutoff_at: string;
  status: "open" | "closed";
  closed_at: string | null;
  orders: DeliveryOrder[];
};

type AdminResponse = {
  cycles: DeliveryCycle[];
  error?: string;
};

type DeliveryFilter = "all" | "pending" | "route" | "delivered";

const FILTERS: Array<{ key: DeliveryFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Por entregar" },
  { key: "route", label: "En camino" },
  { key: "delivered", label: "Entregados" },
];

function hasCoordinates(order: DeliveryOrder) {
  const latitude = Number(order.latitude);
  const longitude = Number(order.longitude);
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

function isPaymentPending(status: string) {
  return status === "pending" || status === "pending_payment";
}

function isPendingDelivery(status: string) {
  return status === "confirmed" || status === "preparing";
}

function belongsToFilter(order: DeliveryOrder, filter: DeliveryFilter) {
  if (order.status === "cancelled") return false;
  if (filter === "all") return true;
  if (filter === "pending") return isPendingDelivery(order.status);
  if (filter === "route") return order.status === "ready";
  return order.status === "delivered";
}

function statusLabel(status: string) {
  if (isPaymentPending(status)) return "Pago por confirmar";
  if (status === "confirmed") return "Confirmado";
  if (status === "preparing") return "Preparando";
  if (status === "ready") return "En camino";
  if (status === "delivered") return "Entregado";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function statusRank(status: string) {
  if (isPaymentPending(status)) return 0;
  if (status === "confirmed") return 1;
  if (status === "preparing") return 2;
  if (status === "ready") return 3;
  if (status === "delivered") return 4;
  return 5;
}

function googleMapsUrl(order: DeliveryOrder) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${Number(order.latitude)},${Number(order.longitude)}`)}`;
}

function wazeUrl(order: DeliveryOrder) {
  return `https://www.waze.com/ul?ll=${encodeURIComponent(`${Number(order.latitude)},${Number(order.longitude)}`)}&navigate=yes`;
}

export default function AdminDeliveriesPage() {
  const [cycles, setCycles] = useState<DeliveryCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [activeFilter, setActiveFilter] = useState<DeliveryFilter>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/delivery-cycles", {
        cache: "no-store",
      });
      const data = (await response.json()) as AdminResponse;

      if (response.status === 401 || response.status === 403) {
        router.push("/admin");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las entregas");
      }

      const today = getCostaRicaDateKey();
      const operational = [...data.cycles]
        .filter((cycle) => cycle.delivery_date >= today)
        .sort((a, b) => a.delivery_date.localeCompare(b.delivery_date))
        .slice(0, 3);
      const history = [...data.cycles]
        .filter((cycle) => cycle.delivery_date < today)
        .sort((a, b) => b.delivery_date.localeCompare(a.delivery_date))
        .slice(0, 4);
      const visibleCycles = [...operational, ...history];

      setCycles(visibleCycles);
      setSelectedCycleId((current) => {
        if (visibleCycles.some((cycle) => cycle.id === current)) return current;

        const preferred =
          operational.find((cycle) => cycle.orders.length > 0) ??
          visibleCycles.find((cycle) => cycle.orders.length > 0) ??
          operational[0] ??
          visibleCycles[0];

        return preferred?.id ?? "";
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar las entregas"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const selectedCycle = useMemo(
    () => cycles.find((cycle) => cycle.id === selectedCycleId) ?? null,
    [cycles, selectedCycleId]
  );

  const validOrders = useMemo(
    () =>
      (selectedCycle?.orders ?? [])
        .filter((order) => order.status !== "cancelled")
        .filter(hasCoordinates)
        .sort((a, b) => {
          const rank = statusRank(a.status) - statusRank(b.status);
          if (rank !== 0) return rank;
          return a.guest_name.localeCompare(b.guest_name, "es");
        }),
    [selectedCycle]
  );

  const missingLocationCount = useMemo(
    () =>
      (selectedCycle?.orders ?? []).filter(
        (order) => order.status !== "cancelled" && !hasCoordinates(order)
      ).length,
    [selectedCycle]
  );

  const visibleOrders = useMemo(
    () => validOrders.filter((order) => belongsToFilter(order, activeFilter)),
    [validOrders, activeFilter]
  );

  const mapOrders = useMemo<DeliveryMapOrder[]>(
    () =>
      visibleOrders.map((order) => ({
        id: order.id,
        guest_name: order.guest_name,
        latitude: Number(order.latitude),
        longitude: Number(order.longitude),
        address_description: order.address_description,
        status: order.status,
      })),
    [visibleOrders]
  );

  const counts = useMemo(
    () => ({
      total: validOrders.length,
      payment: validOrders.filter((order) => isPaymentPending(order.status)).length,
      pending: validOrders.filter((order) => isPendingDelivery(order.status)).length,
      route: validOrders.filter((order) => order.status === "ready").length,
      delivered: validOrders.filter((order) => order.status === "delivered").length,
    }),
    [validOrders]
  );

  async function updateStatus(order: DeliveryOrder, status: string) {
    setWorkingOrderId(order.id);

    const isGoingOnTheWay = status === "ready";
    const whatsappUrl = isGoingOnTheWay
      ? buildWhatsAppUrl({
          phone: order.guest_phone,
          message: buildOrderOnTheWayMessage({
            customerName: order.guest_name,
            orderId: order.id,
          }),
        })
      : null;

    // Abrimos una pestaña vacía durante el click para evitar que el navegador
    // bloquee WhatsApp por ocurrir después de una operación asíncrona.
    const whatsappWindow = whatsappUrl
      ? window.open("about:blank", "_blank")
      : null;

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id);

    if (updateError) {
      whatsappWindow?.close();
      alert("No se pudo cambiar el estado del pedido.");
      console.error("ERROR CAMBIANDO ESTADO:", updateError);
      setWorkingOrderId(null);
      return;
    }

    // Para "En camino" no dependemos de ninguna API paga: abrimos
    // WhatsApp con el mensaje listo y la persona administradora solo envía.
    if (isGoingOnTheWay) {
      if (whatsappUrl && whatsappWindow) {
        whatsappWindow.opener = null;
        whatsappWindow.location.href = whatsappUrl;
      } else if (!whatsappUrl) {
        alert(
          "El pedido quedó marcado como En camino, pero no tiene un teléfono válido para abrir WhatsApp."
        );
      } else {
        alert(
          "El pedido quedó marcado como En camino, pero el navegador bloqueó la ventana de WhatsApp."
        );
      }
    }

    await loadData();
    setWorkingOrderId(null);
  }

  function deliveryAction(order: DeliveryOrder) {
    if (order.status === "confirmed" || order.status === "preparing") {
      return {
        label: "Marcar en camino",
        status: "ready",
        icon: Truck,
      };
    }

    if (order.status === "ready") {
      return {
        label: "Marcar entregado",
        status: "delivered",
        icon: CheckCircle2,
      };
    }

    return null;
  }

  if (loading) {
    return (
      <main className="admin-container">
        <p>Cargando entregas...</p>
      </main>
    );
  }

  return (
    <main className="admin-container deliveries-admin-page">
      <header className="admin-page-header deliveries-page-header">
        <div>
          <Link className="admin-back-link" href="/admin/dashboard">
            <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
            Volver al panel
          </Link>
          <h1>Entregas</h1>
          <p>Ubicaciones y seguimiento operativo de cada día de reparto.</p>
        </div>
      </header>

      {error && <div className="admin-error-box">{error}</div>}

      {cycles.length === 0 ? (
        <section className="orders-empty-state">
          <h2>No hay entregas disponibles</h2>
          <p>Cuando existan ciclos de entrega aparecerán en este panel.</p>
        </section>
      ) : (
        <>
          <section className="delivery-cycle-picker deliveries-cycle-picker">
            <div className="delivery-cycle-picker-heading">
              <h2>Fecha de entrega</h2>
              <span>Próximas entregas y las 4 más recientes.</span>
            </div>
            <div className="delivery-cycle-buttons">
              {cycles.map((cycle) => (
                <button
                  key={cycle.id}
                  type="button"
                  className={cycle.id === selectedCycleId ? "active" : ""}
                  onClick={() => {
                    setSelectedCycleId(cycle.id);
                    setActiveFilter("all");
                    setSelectedOrderId(null);
                  }}
                >
                  <strong>{formatDeliveryDateShort(cycle.delivery_date)}</strong>
                  <span>{cycle.orders.length} pedidos</span>
                </button>
              ))}
            </div>
          </section>

          {selectedCycle && (
            <>
              <section className="deliveries-heading-row">
                <div>
                  <span className="delivery-cycle-eyebrow">Ruta seleccionada</span>
                  <h2>{formatDeliveryDate(selectedCycle.delivery_date)}</h2>
                </div>
                <span className="deliveries-location-count">
                  <MapPin size={16} aria-hidden="true" />
                  {counts.total} ubicaciones
                </span>
              </section>

              <section className="delivery-stats-grid" aria-label="Resumen de entregas">
                <div className="delivery-stat-card">
                  <span>Total</span>
                  <strong>{counts.total}</strong>
                </div>
                <div className="delivery-stat-card is-payment">
                  <span>Pago por confirmar</span>
                  <strong>{counts.payment}</strong>
                </div>
                <div className="delivery-stat-card is-pending">
                  <span>Por entregar</span>
                  <strong>{counts.pending}</strong>
                </div>
                <div className="delivery-stat-card is-route">
                  <span>En camino</span>
                  <strong>{counts.route}</strong>
                </div>
                <div className="delivery-stat-card is-delivered">
                  <span>Entregados</span>
                  <strong>{counts.delivered}</strong>
                </div>
              </section>

              {missingLocationCount > 0 && (
                <div className="delivery-location-warning">
                  {missingLocationCount} pedido{missingLocationCount === 1 ? "" : "s"} no tiene una ubicación válida guardada y no puede mostrarse en el mapa.
                </div>
              )}

              <section className="delivery-map-section">
                <div className="delivery-filter-tabs">
                  {FILTERS.map((filter) => {
                    const count =
                      filter.key === "all"
                        ? validOrders.length
                        : validOrders.filter((order) =>
                            belongsToFilter(order, filter.key)
                          ).length;

                    return (
                      <button
                        key={filter.key}
                        type="button"
                        className={activeFilter === filter.key ? "active" : ""}
                        onClick={() => {
                          setActiveFilter(filter.key);
                          setSelectedOrderId(null);
                        }}
                      >
                        {filter.label}
                        <span>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {mapOrders.length > 0 ? (
                  <DeliveryMap
                    orders={mapOrders}
                    selectedOrderId={selectedOrderId}
                    onSelectOrder={setSelectedOrderId}
                  />
                ) : (
                  <div className="delivery-map-empty">
                    No hay ubicaciones en esta etapa.
                  </div>
                )}
              </section>

              <section className="delivery-stop-section">
                <div className="delivery-stop-heading">
                  <div>
                    <h2>Paradas</h2>
                    <p>El número de cada tarjeta corresponde al pin del mapa.</p>
                  </div>
                </div>

                {visibleOrders.length === 0 ? (
                  <div className="orders-empty-state compact">
                    No hay pedidos en esta etapa.
                  </div>
                ) : (
                  <div className="delivery-stop-list">
                    {visibleOrders.map((order, index) => {
                      const action = deliveryAction(order);
                      const ActionIcon = action?.icon;

                      return (
                        <article
                          className={`delivery-stop-card${selectedOrderId === order.id ? " is-selected" : ""}`}
                          key={order.id}
                        >
                          <div className="delivery-stop-index">{index + 1}</div>

                          <div className="delivery-stop-content">
                            <div className="delivery-stop-topline">
                              <div>
                                <h3>{order.guest_name}</h3>
                                <span>Pedido #{order.id.slice(0, 8)}</span>
                              </div>
                              <span className={`delivery-order-status status-${order.status}`}>
                                {statusLabel(order.status)}
                              </span>
                            </div>

                            <div className="delivery-stop-details">
                              <div>
                                <MapPin size={17} aria-hidden="true" />
                                <span>
                                  {order.address_description?.trim() ||
                                    `${Number(order.latitude).toFixed(5)}, ${Number(order.longitude).toFixed(5)}`}
                                </span>
                              </div>
                              <a href={`tel:${order.guest_phone}`}>
                                <Phone size={17} aria-hidden="true" />
                                <span>{order.guest_phone}</span>
                              </a>
                            </div>

                            {order.customer_notes && (
                              <div className="delivery-stop-notes">
                                <strong>Notas del cliente</strong>
                                <p>{order.customer_notes}</p>
                              </div>
                            )}

                            <div className="delivery-stop-footer">
                              <strong>₡{Number(order.total).toLocaleString("es-CR")}</strong>
                              <div className="delivery-stop-actions">
                                <button
                                  type="button"
                                  className="delivery-secondary-action"
                                  onClick={() => setSelectedOrderId(order.id)}
                                >
                                  <MapPin size={16} aria-hidden="true" />
                                  Ver en mapa
                                </button>
                                <a
                                  href={wazeUrl(order)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="delivery-secondary-action"
                                >
                                  <Navigation size={16} aria-hidden="true" />
                                  Waze
                                </a>
                                <a
                                  href={googleMapsUrl(order)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="delivery-secondary-action"
                                >
                                  <ExternalLink size={16} aria-hidden="true" />
                                  Google Maps
                                </a>
                                {action && ActionIcon && (
                                  <button
                                    type="button"
                                    className="delivery-primary-action"
                                    disabled={workingOrderId === order.id}
                                    onClick={() => updateStatus(order, action.status)}
                                  >
                                    <ActionIcon size={16} aria-hidden="true" />
                                    {workingOrderId === order.id
                                      ? "Actualizando..."
                                      : action.label}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
