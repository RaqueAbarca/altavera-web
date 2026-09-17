"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getPaymentMethodLabel } from "@/lib/paymentMethods";
import "../admin.css";
import "./historial.css";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number | string;
  unit: string | null;
  maturity_preference: string | null;
};

type DeliveryCycleRelation =
  | { delivery_date?: string | null }
  | Array<{ delivery_date?: string | null }>
  | null;

type HistoryOrder = {
  id: string;
  user_id: string | null;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | number | null;
  total: number | string;
  shipping: number | string | null;
  payment_method: string;
  status: string;
  created_at: string;
  address_description: string | null;
  delivery_cycle_id: string | null;
  delivery_cycles: DeliveryCycleRelation;
  order_item: OrderItem[];
};

type HistoryResponse = {
  orders: HistoryOrder[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  error?: string;
};

const STATUS_OPTIONS = [
  ["all", "Todos"],
  ["pending", "Pago por confirmar"],
  ["confirmed", "Confirmado"],
  ["preparing", "Preparando"],
  ["ready", "En camino"],
  ["delivered", "Entregado"],
  ["cancelled", "Cancelado"],
] as const;

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pago por confirmar",
    pending_payment: "Pago por confirmar",
    confirmed: "Confirmado",
    preparing: "Preparando",
    ready: "En camino",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };
  return labels[status] ?? status;
}

function formatMoney(value: number | string | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Costa_Rica",
  }).format(new Date(value));
}

function getDeliveryDate(value: DeliveryCycleRelation) {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!relation?.delivery_date) return null;
  const [year, month, day] = relation.delivery_date.split("-").map(Number);
  if (!year || !month || !day) return relation.delivery_date;
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
  }).format(new Date(year, month - 1, day));
}

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), status });
      if (query) params.set("q", query);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(`/api/admin/order-history?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as HistoryResponse;

      if (response.status === 401 || response.status === 403) {
        router.push("/admin");
        return;
      }
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el historial.");

      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [page, status, from, to, query]);

  const rangeText = useMemo(() => {
    if (!total) return "0 pedidos";
    const start = (page - 1) * 25 + 1;
    const end = Math.min(page * 25, total);
    return `${start}–${end} de ${total} pedidos`;
  }, [page, total]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(queryInput.trim());
  }

  function clearFilters() {
    setQueryInput("");
    setQuery("");
    setStatus("all");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <main className="admin-container order-history-page">
      <header className="admin-page-header">
        <div>
          <Link href="/admin/dashboard" className="admin-back-link">
            <ArrowLeft size={17} /> Volver al dashboard
          </Link>
          <h1>Historial de pedidos</h1>
          <p>Consulta todos los pedidos de Altavera, incluso los de cuentas eliminadas.</p>
        </div>
      </header>

      <section className="history-filters" aria-label="Filtros del historial">
        <form className="history-search" onSubmit={submitSearch}>
          <Search size={18} aria-hidden="true" />
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Nombre, correo, teléfono o ID completo"
            aria-label="Buscar pedidos"
          />
          <button type="submit">Buscar</button>
        </form>

        <div className="history-filter-grid">
          <label>
            Estado
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setPage(1);
                setFrom(event.target.value);
              }}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setPage(1);
                setTo(event.target.value);
              }}
            />
          </label>
          <button type="button" className="history-clear-button" onClick={clearFilters}>
            Limpiar filtros
          </button>
        </div>
      </section>

      <div className="history-results-heading">
        <strong>{rangeText}</strong>
        {query ? <span>Resultados para “{query}”</span> : null}
      </div>

      {error ? <div className="admin-error-box">{error}</div> : null}

      {loading ? (
        <div className="orders-empty-state"><p>Cargando historial…</p></div>
      ) : orders.length === 0 ? (
        <div className="orders-empty-state">
          <h2>No encontramos pedidos</h2>
          <p>Prueba con otros filtros o limpia la búsqueda.</p>
        </div>
      ) : (
        <section className="history-table-wrap" aria-label="Pedidos históricos">
          <table className="history-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Entrega</th>
                <th>Estado</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Cuenta</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td data-label="Pedido">
                    <strong>#{order.id.slice(0, 8)}</strong>
                    <small title={order.id}>{order.id}</small>
                  </td>
                  <td data-label="Cliente">
                    <strong>{order.guest_name || "Sin nombre"}</strong>
                    <small>{order.guest_email || "Sin correo"}</small>
                    <small>{order.guest_phone ? String(order.guest_phone) : "Sin teléfono"}</small>
                  </td>
                  <td data-label="Fecha">{formatDate(order.created_at)}</td>
                  <td data-label="Entrega">{getDeliveryDate(order.delivery_cycles) ?? "Sin ciclo"}</td>
                  <td data-label="Estado">
                    <span className={`history-status history-status--${order.status}`}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td data-label="Pago">{getPaymentMethodLabel(order.payment_method)}</td>
                  <td data-label="Total"><strong>{formatMoney(order.total)}</strong></td>
                  <td data-label="Cuenta">
                    <span className={order.user_id ? "history-account-linked" : "history-account-unlinked"}>
                      {order.user_id ? "Vinculada" : "Desvinculada"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <nav className="history-pagination" aria-label="Paginación del historial">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page <= 1 || loading}
        >
          <ChevronLeft size={17} /> Anterior
        </button>
        <span>Página {page} de {totalPages}</span>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages || loading}
        >
          Siguiente <ChevronRight size={17} />
        </button>
      </nav>
    </main>
  );
}
