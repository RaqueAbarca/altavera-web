"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  PackageCheck,
  ShoppingBag,
  Truck,
  WalletCards,
} from "lucide-react";
import { formatDeliveryDate } from "@/lib/deliverySchedule";
import { getMaturityLabel } from "@/lib/maturity";
import "./seguimiento.css";

type TrackingItem = {
  id: string;
  product_name: string;
  quantity: number | string;
  unit: string | null;
  maturity_preference: string | null;
};

type TrackingOrder = {
  id: string;
  status: string;
  created_at: string;
  delivery_cycle: { delivery_date: string } | null;
  order_item: TrackingItem[];
};

type TrackingStep = {
  key: string;
  label: string;
  description: string;
  icon: typeof WalletCards;
};

const TRACKING_STEPS: TrackingStep[] = [
  {
    key: "pending_payment",
    label: "Pago por confirmar",
    description: "Recibimos tu pedido y estamos esperando confirmar el pago.",
    icon: WalletCards,
  },
  {
    key: "confirmed",
    label: "Confirmado",
    description: "El pago fue verificado y tu pedido quedó confirmado.",
    icon: CheckCircle2,
  },
  {
    key: "preparing",
    label: "Preparando",
    description: "Estamos preparando tus productos para la entrega.",
    icon: PackageCheck,
  },
  {
    key: "ready",
    label: "En camino",
    description: "Tu pedido ya salió para entrega.",
    icon: Truck,
  },
  {
    key: "delivered",
    label: "Entregado",
    description: "Tu pedido fue marcado como entregado.",
    icon: Check,
  },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0,
  pending_payment: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  delivered: 4,
};

function formatQuantity(quantity: number, unit: string | null) {
  const amount = quantity.toLocaleString("es-CR", {
    maximumFractionDigits: 2,
  });

  return unit?.trim() ? `${amount} ${unit.trim()}` : amount;
}

export default function SeguimientoPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hash = window.location.hash.replace(/^#token=/, "");
    const token = hash ? decodeURIComponent(hash) : "";
    setAccessToken(token);

    async function loadTracking(showInitialLoading: boolean) {
      if (showInitialLoading) setLoading(true);

      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(id)}/tracking`,
          {
            headers: token
              ? { "x-order-access-token": token }
              : undefined,
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar el seguimiento");
        }

        if (!cancelled) {
          setOrder(data as TrackingOrder);
          setError(null);
          setLastUpdatedAt(new Date());
        }
      } catch (loadError) {
        if (!cancelled && showInitialLoading) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el seguimiento"
          );
        }
      } finally {
        if (!cancelled && showInitialLoading) setLoading(false);
      }
    }

    void loadTracking(true);
    const timer = window.setInterval(() => {
      void loadTracking(false);
    }, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id]);

  const currentIndex = useMemo(() => {
    if (!order) return 0;
    return STATUS_INDEX[order.status] ?? 0;
  }, [order]);

  if (loading) {
    return (
      <main className="container seguimiento-page seguimiento-state">
        Cargando el seguimiento de tu pedido...
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="container seguimiento-page seguimiento-state">
        <section className="seguimiento-error-card">
          <h1>Seguimiento no disponible</h1>
          <p>
            No pudimos abrir este pedido con el enlace actual. Revisa que estés usando
            el enlace privado que recibiste al completar tu compra.
          </p>
          <Link href="/productos" className="seguimiento-primary-action">
            Volver a productos
          </Link>
        </section>
      </main>
    );
  }

  const shortOrderId = order.id.slice(0, 8).toUpperCase();
  const cancelled = order.status === "cancelled";
  const currentStep = TRACKING_STEPS[currentIndex];
  const confirmationUrl = `/pedido/${encodeURIComponent(order.id)}${
    accessToken ? `#token=${encodeURIComponent(accessToken)}` : ""
  }`;

  return (
    <main className="container seguimiento-page">
      <section className="seguimiento-hero">
        <span className="seguimiento-eyebrow">Seguimiento de pedido</span>
        <h1>Pedido #{shortOrderId}</h1>
        <p>
          {cancelled
            ? "Este pedido fue cancelado."
            : currentStep.description}
        </p>

        <div className="seguimiento-meta">
          {order.delivery_cycle?.delivery_date && (
            <div>
              <Clock3 size={18} aria-hidden="true" />
              <span>Entrega</span>
              <strong>{formatDeliveryDate(order.delivery_cycle.delivery_date)}</strong>
            </div>
          )}
          <div>
            <CircleDot size={18} aria-hidden="true" />
            <span>Estado</span>
            <strong>{cancelled ? "Cancelado" : currentStep.label}</strong>
          </div>
        </div>
      </section>

      <section className="seguimiento-card" aria-labelledby="seguimiento-progress-title">
        <div className="seguimiento-card-heading">
          <div>
            <span>Estado del pedido</span>
            <h2 id="seguimiento-progress-title">
              {cancelled ? "Pedido cancelado" : currentStep.label}
            </h2>
          </div>
          {!cancelled && <small>Se actualiza automáticamente</small>}
        </div>

        {cancelled ? (
          <div className="seguimiento-cancelled">
            <span>Cancelado</span>
            <p>Si necesitas ayuda con este pedido, comunícate con Altavera.</p>
          </div>
        ) : (
          <ol className="seguimiento-progress">
            {TRACKING_STEPS.map((step, index) => {
              const Icon = step.icon;
              const complete = index < currentIndex;
              const current = index === currentIndex;

              return (
                <li
                  key={step.key}
                  className={[
                    complete ? "is-complete" : "",
                    current ? "is-current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={current ? "step" : undefined}
                >
                  <div className="seguimiento-progress-icon" aria-hidden="true">
                    {complete ? <Check size={18} /> : <Icon size={18} />}
                  </div>
                  <div className="seguimiento-progress-copy">
                    <strong>{step.label}</strong>
                    <span>{step.description}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {lastUpdatedAt && !cancelled && (
          <p className="seguimiento-updated">
            Última actualización: {lastUpdatedAt.toLocaleTimeString("es-CR", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </section>

      <details className="seguimiento-products">
        <summary>
          <span>
            <ShoppingBag size={18} aria-hidden="true" />
            Productos del pedido
          </span>
          <strong>{order.order_item.length}</strong>
        </summary>

        <div className="seguimiento-products-list">
          {order.order_item.map((item) => {
            const quantity = Number(item.quantity);
            const maturityLabel = getMaturityLabel(item.maturity_preference);

            return (
              <div key={item.id} className="seguimiento-product">
                <div>
                  <strong>{item.product_name}</strong>
                  {maturityLabel && <span>Maduración: {maturityLabel}</span>}
                </div>
                <strong>{formatQuantity(quantity, item.unit)}</strong>
              </div>
            );
          })}
        </div>
      </details>

      <p className="seguimiento-privacy-note">
        Por privacidad, esta vista no muestra tu dirección, teléfono ni datos de pago.
      </p>

      <div className="seguimiento-actions">
        {order.status === "pending" || order.status === "pending_payment" ? (
          <Link href={confirmationUrl} className="seguimiento-secondary-action">
            Ver instrucciones de pago
          </Link>
        ) : null}
        <Link href="/productos" className="seguimiento-primary-action">
          Volver a productos
        </Link>
      </div>
    </main>
  );
}
