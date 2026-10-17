"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { getMaturityLabel } from "@/lib/maturity";
import { getPaymentMethodLabel } from "@/lib/paymentMethods";
import "./receipt.css";

type ReceiptItem = {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  maturityPreference: string | null;
  unit: string | null;
};

type ReceiptRefund = {
  orderItemId: string;
  productName: string;
  amount: number;
  paid: boolean;
  paidAt: string | null;
};

type ReceiptData = {
  order: {
    id: string;
    customerName: string;
    subtotal: number;
    shipping: number;
    total: number;
    finalTotal: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    deliveryDate: string | null;
    addressDescription: string | null;
    items: ReceiptItem[];
  };
  refunds: ReceiptRefund[];
  refundTotal: number;
  reviewUrl: string;
};

function money(value: number) {
  return `₡${Number(value || 0).toLocaleString("es-CR", {
    maximumFractionDigits: 2,
  })}`;
}

function quantity(value: number) {
  return Number(value || 0).toLocaleString("es-CR", {
    maximumFractionDigits: 3,
  });
}

function dateLabel(value: string | null) {
  if (!value) return "Sin fecha de entrega";
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Costa_Rica",
  }).format(new Date(`${value}T12:00:00-06:00`));
}

export default function OrderReceiptPage() {
  const params = useParams<{ id: string }>();
  const orderId = String(params?.id ?? "");
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!orderId) return;
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/admin/orders/${encodeURIComponent(orderId)}/receipt`,
          { cache: "no-store" }
        );
        const result = (await response.json()) as ReceiptData & { error?: string };
        if (!response.ok) throw new Error(result.error || "No se pudo cargar el comprobante.");
        if (!cancelled) setData(result);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el comprobante."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const refundByItem = useMemo(
    () => new Map((data?.refunds ?? []).map((refund) => [refund.orderItemId, refund])),
    [data?.refunds]
  );

  if (loading) {
    return <main className="receipt-page-state">Preparando comprobante...</main>;
  }

  if (error || !data) {
    return (
      <main className="receipt-page-state receipt-page-state--error">
        <strong>No se pudo abrir el comprobante.</strong>
        <span>{error || "Pedido no disponible."}</span>
        <Link href="/admin/pedidos">Volver a pedidos</Link>
      </main>
    );
  }

  const { order } = data;
  const shortId = order.id.slice(0, 8).toUpperCase();
  const densityClass = order.items.length >= 16
    ? " delivery-receipt--ultra-dense"
    : order.items.length >= 10
      ? " delivery-receipt--dense"
      : "";

  return (
    <main className="receipt-screen">
      <div className="receipt-toolbar">
        <Link href="/admin/pedidos" className="receipt-toolbar-link">
          <ArrowLeft size={18} aria-hidden="true" />
          Volver a pedidos
        </Link>
        <button type="button" onClick={() => window.print()}>
          <Printer size={18} aria-hidden="true" />
          Imprimir
        </button>
      </div>

      <article className={`delivery-receipt${densityClass}`}>
        <header className="delivery-receipt__header">
          <img src="/logo.svg" alt="Altavera" className="delivery-receipt__logo" />
          <div>
            <span>Comprobante de pedido</span>
            <strong>#{shortId}</strong>
          </div>
        </header>

        <section className="delivery-receipt__customer">
          <div>
            <span>Cliente</span>
            <strong>{order.customerName || "Cliente"}</strong>
          </div>
          <div>
            <span>Entrega</span>
            <strong className="capitalize">{dateLabel(order.deliveryDate)}</strong>
          </div>
          <div>
            <span>Pago</span>
            <strong>{getPaymentMethodLabel(order.paymentMethod)}</strong>
          </div>
          {order.addressDescription && (
            <div className="delivery-receipt__customer-wide">
              <span>Dirección</span>
              <strong>{order.addressDescription}</strong>
            </div>
          )}
        </section>

        <div className="delivery-receipt__content">
          <section className="delivery-receipt__items">
            <h1>Tu pedido</h1>
            {order.items.map((item) => {
              const refund = refundByItem.get(item.id);
              const maturity = getMaturityLabel(item.maturityPreference);
              return (
                <div
                  key={item.id}
                  className={`delivery-receipt__item${refund ? " delivery-receipt__item--unavailable" : ""}`}
                >
                  <div className="delivery-receipt__item-copy">
                    <div className="delivery-receipt__item-name">
                      <strong>{item.productName}</strong>
                      {refund && <span>No entregado</span>}
                    </div>
                    <small>
                      {quantity(item.quantity)}{item.unit ? ` ${item.unit}` : ""}
                      {maturity ? ` · ${maturity}` : ""}
                    </small>
                    {refund && (
                      <small className="delivery-receipt__refund-status">
                        {refund.paid ? "Reembolso realizado" : "Reembolso pendiente"}: {money(refund.amount)}
                      </small>
                    )}
                  </div>
                  <div className="delivery-receipt__item-price">
                    <small>{money(item.price)} c/u</small>
                    <strong>{money(item.price * item.quantity)}</strong>
                  </div>
                </div>
              );
            })}
          </section>

          <aside className="delivery-receipt__side">
            <section className="delivery-receipt__totals">
              <h2>Resumen</h2>
              <div>
                <span>Productos</span>
                <strong>{money(order.subtotal)}</strong>
              </div>
              <div>
                <span>Envío</span>
                <strong>{order.shipping > 0 ? money(order.shipping) : "Gratis"}</strong>
              </div>
              <div>
                <span>Total pagado</span>
                <strong>{money(order.total)}</strong>
              </div>
              {data.refundTotal > 0 && (
                <>
                  <div className="delivery-receipt__refund-total">
                    <span>Reembolsos</span>
                    <strong>− {money(data.refundTotal)}</strong>
                  </div>
                  <div className="delivery-receipt__grand-total">
                    <span>Total final</span>
                    <strong>{money(order.finalTotal)}</strong>
                  </div>
                </>
              )}
            </section>

            <section className="delivery-receipt__thanks">
              <h2>Gracias por elegir Altavera</h2>
              <p>Esperamos que disfrutés tu pedido.</p>
              <div className="delivery-receipt__review">
                <img
                  src="/google-review-qr.png"
                  alt="Código QR para dejar una reseña de Altavera en Google"
                />
                <div>
                  <strong>¿Te gustó el servicio?</strong>
                  <p>Escaneá el código y contanos tu experiencia en Google.</p>
                </div>
              </div>
            </section>

            <footer className="delivery-receipt__footer">
              <span>altaveraenlinea.com</span>
              <small>Este comprobante resume tu pedido y no sustituye una factura electrónica.</small>
            </footer>
          </aside>
        </div>
      </article>
    </main>
  );
}
