"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ShoppingList from "@/components/admin/ShoppingList";
import { getMaturityLabel } from "@/lib/maturity";
import {
  formatCutoffLabel,
  formatDeliveryDate,
  formatDeliveryDateShort,
  getCostaRicaDateKey,
} from "@/lib/deliverySchedule";
import "../admin.css";

type OrderItem = {
  id: string;
  product_id: number | null;
  product_name: string;
  price: number | string;
  quantity: number | string;
  maturity_preference: string | null;
  category: string | null;
  unit: string | null;
};

type Order = {
  id: string;
  guest_name: string;
  guest_phone: string;
  total: number | string;
  status: string;
  created_at: string;
  customer_notes: string | null;
  delivery_cycle_id: string | null;
  order_item: OrderItem[];
};

type ShoppingListItem = {
  id: string;
  product_id: number | null;
  product_name: string;
  quantity: number | string;
  unit: string | null;
  maturity_preference: string | null;
  category: string | null;
};

type DeliveryCycle = {
  id: string;
  delivery_date: string;
  cutoff_at: string;
  status: "open" | "closed";
  closed_at: string | null;
  orders: Order[];
  shoppingList: {
    id: string;
    delivery_cycle_id: string;
    created_at: string;
    finalized_at: string;
    shopping_list_items: ShoppingListItem[];
  } | null;
};

type AdminResponse = {
  cycles: DeliveryCycle[];
  legacyOrders: Order[];
  error?: string;
};

type StatusTab = "pending" | "preparing" | "ready" | "delivered";

const STATUS_TABS: Array<{ key: StatusTab; label: string }> = [
  { key: "pending", label: "Pendientes" },
  { key: "preparing", label: "Preparando" },
  { key: "ready", label: "Enviados" },
  { key: "delivered", label: "Entregados" },
];

function belongsToTab(status: string, tab: StatusTab) {
  if (tab === "pending") {
    return status === "pending" || status === "pending_payment";
  }
  return status === tab;
}

function buildLiveShoppingList(orders: Order[]) {
  const map = new Map<
    string,
    {
      name: string;
      quantity: number;
      maturityPreference: string | null;
      category: string | null;
      unit: string | null;
    }
  >();

  orders
    .filter((order) => order.status !== "cancelled")
    .forEach((order) => {
      order.order_item.forEach((item) => {
        const maturityPreference = item.maturity_preference ?? null;
        const key = `${item.product_id ?? item.product_name}::${maturityPreference ?? "none"}`;
        const current = map.get(key);

        map.set(key, {
          name: item.product_name,
          quantity: (current?.quantity ?? 0) + Number(item.quantity),
          maturityPreference,
          category: item.category ?? null,
          unit: item.unit ?? null,
        });
      });
    });

  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es")
  );
}

export default function AdminOrdersPage() {
  const [cycles, setCycles] = useState<DeliveryCycle[]>([]);
  const [legacyOrders, setLegacyOrders] = useState<Order[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("pending");
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
        throw new Error(data.error ?? "No se pudo cargar el panel");
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
      setLegacyOrders(data.legacyOrders ?? []);
      setSelectedCycleId((current) => {
        if (visibleCycles.some((cycle) => cycle.id === current)) {
          return current;
        }

        const preferred =
          operational.find((cycle) => cycle.orders.length > 0) ??
          operational.find((cycle) => cycle.status === "open") ??
          visibleCycles[0];

        return preferred?.id ?? "";
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el panel"
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

  const visibleOrders = useMemo(
    () =>
      (selectedCycle?.orders ?? []).filter((order) =>
        belongsToTab(order.status, activeTab)
      ),
    [selectedCycle, activeTab]
  );

  const shoppingProducts = useMemo(() => {
    if (!selectedCycle) return [];

    if (selectedCycle.shoppingList) {
      return selectedCycle.shoppingList.shopping_list_items
        .map((item) => ({
          name: item.product_name,
          quantity: Number(item.quantity),
          unit: item.unit,
          maturityPreference: item.maturity_preference,
          category: item.category ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
    }

    return buildLiveShoppingList(selectedCycle.orders);
  }, [selectedCycle]);

  async function updateStatus(order: Order, status: string) {
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id);

    if (updateError) {
      alert("No se pudo cambiar el estado del pedido.");
      console.error("ERROR CAMBIANDO ESTADO:", updateError);
      return;
    }

    const { error: functionError } = await supabase.functions.invoke(
      "order-status",
      {
        body: {
          orderId: order.id,
          status,
        },
      }
    );

    if (functionError) {
      console.error("ERROR NOTIFICANDO ESTADO:", functionError);
    }

    await loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  function nextAction(order: Order) {
    if (belongsToTab(order.status, "pending")) {
      return {
        label: "Pasar a preparación",
        status: "preparing",
      };
    }

    if (order.status === "preparing") {
      return {
        label: "Marcar como enviado",
        status: "ready",
      };
    }

    if (order.status === "ready") {
      return {
        label: "Marcar como entregado",
        status: "delivered",
      };
    }

    return null;
  }

  if (loading) {
    return (
      <main className="admin-container">
        <p>Cargando pedidos...</p>
      </main>
    );
  }

  return (
    <main className="admin-container orders-admin-page">
      <header className="admin-page-header">
        <div>
          <h1>Panel de pedidos</h1>
          <p>Pedidos organizados por fecha de entrega y estado.</p>
        </div>
        <button className="admin-logout-button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>

      {error && <div className="admin-error-box">{error}</div>}

      {cycles.length === 0 ? (
        <section className="orders-empty-state">
          <h2>No hay ciclos de entrega disponibles</h2>
          <p>Aplica la migración de ciclos de entrega en Supabase y vuelve a cargar.</p>
        </section>
      ) : (
        <>
          <section className="delivery-cycle-picker">
            <div className="delivery-cycle-picker-heading">
              <h2>Entregas</h2>
              <span>Se muestran hasta 3 entregas próximas y las 4 más recientes.</span>
            </div>

            <div className="delivery-cycle-buttons">
              {cycles.map((cycle) => (
                <button
                  key={cycle.id}
                  type="button"
                  className={cycle.id === selectedCycleId ? "active" : ""}
                  onClick={() => {
                    setSelectedCycleId(cycle.id);
                    setActiveTab("pending");
                  }}
                >
                  <strong>{formatDeliveryDateShort(cycle.delivery_date)}</strong>
                  <span>{cycle.status === "open" ? "Recibiendo pedidos" : "Corte realizado"}</span>
                </button>
              ))}
            </div>
          </section>

          {selectedCycle && (
            <>
              <section className="delivery-cycle-summary">
                <div>
                  <span className="delivery-cycle-eyebrow">Entrega seleccionada</span>
                  <h2>{formatDeliveryDate(selectedCycle.delivery_date)}</h2>
                  <p>Corte: {formatCutoffLabel(selectedCycle.cutoff_at)}</p>
                </div>
                <div className={`cycle-status-badge cycle-status-badge--${selectedCycle.status}`}>
                  {selectedCycle.status === "open" ? "Recibiendo pedidos" : "Corte realizado"}
                </div>
              </section>

              <ShoppingList
                products={shoppingProducts}
                title={
                  selectedCycle.shoppingList
                    ? "Lista de compra del corte"
                    : "Vista previa de la lista de compra"
                }
                subtitle={
                  selectedCycle.shoppingList
                    ? "Esta lista quedó congelada al realizarse el corte."
                    : "Se actualiza con los pedidos y se congela automáticamente al corte."
                }
                printContext={`Entrega: ${formatDeliveryDate(selectedCycle.delivery_date)} · Corte: ${formatCutoffLabel(selectedCycle.cutoff_at)}`}
              />

              <section className="orders-section">
                <div className="order-status-tabs">
                  {STATUS_TABS.map((tab) => {
                    const count = selectedCycle.orders.filter((order) =>
                      belongsToTab(order.status, tab.key)
                    ).length;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        className={activeTab === tab.key ? "active" : ""}
                        onClick={() => setActiveTab(tab.key)}
                      >
                        {tab.label}
                        <span>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {visibleOrders.length === 0 ? (
                  <div className="orders-empty-state compact">
                    No hay pedidos en esta etapa.
                  </div>
                ) : (
                  <div className="orders-grid">
                    {visibleOrders.map((order) => {
                      const action = nextAction(order);

                      return (
                        <article className="order-card" key={order.id}>
                          <div className="order-card-heading">
                            <div>
                              <h3>Pedido #{order.id.slice(0, 8)}</h3>
                              <p>{order.guest_name} · {order.guest_phone}</p>
                            </div>
                            <strong>₡{Number(order.total).toLocaleString("es-CR")}</strong>
                          </div>

                          {order.customer_notes && (
                            <div className="order-customer-notes">
                              <strong>Notas del cliente</strong>
                              <p>{order.customer_notes}</p>
                            </div>
                          )}

                          <ul className="order-products-list">
                            {order.order_item.map((item) => {
                              const maturityLabel = getMaturityLabel(
                                item.maturity_preference
                              );

                              return (
                                <li key={item.id}>
                                  <span>
                                    {item.product_name}
                                    {maturityLabel && (
                                      <small>Maduración: {maturityLabel}</small>
                                    )}
                                  </span>
                                  <strong>x {Number(item.quantity).toLocaleString("es-CR")}</strong>
                                </li>
                              );
                            })}
                          </ul>

                          {action && (
                            <div className="order-actions">
                              <button
                                type="button"
                                onClick={() => updateStatus(order, action.status)}
                              >
                                {action.label}
                              </button>
                            </div>
                          )}
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

      {legacyOrders.length > 0 && (
        <details className="legacy-orders">
          <summary>Pedidos anteriores sin fecha de entrega ({legacyOrders.length})</summary>
          <p>
            Son pedidos creados antes de instalar el sistema de cortes. Se conservan en el historial.
          </p>
        </details>
      )}
    </main>
  );
}
