"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getMaturityLabel } from "@/lib/maturity";
import { formatDeliveryDate } from "@/lib/deliverySchedule";
import "./pedido.css";

type OrderItem = {
  id: string;
  product_name: string;
  price: number | string;
  quantity: number | string;
  maturity_preference: string | null;
};

type Order = {
  id: string;
  customer_notes: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  delivery_cycle: { delivery_date: string } | null;
  order_item: OrderItem[];
};

export default function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const hash = window.location.hash.replace(/^#token=/, "");
        const accessToken = hash
          ? decodeURIComponent(hash)
          : "";

        const response = await fetch(
          `/api/orders/${encodeURIComponent(id)}`,
          {
            headers: accessToken
              ? {
                  "x-order-access-token": accessToken,
                }
              : undefined,
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ?? "No se pudo cargar el pedido"
          );
        }

        setOrder(data as Order);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el pedido"
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id]);

  if (loading) {
    return (
      <main className="container">
        Cargando pedido...
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="container pedido-page">
        <div className="success-card">
          <h1>Pedido no disponible</h1>
          <p>
            {error ?? "No se pudo encontrar este pedido."}
          </p>
          <Link href="/productos">
            Volver a productos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container pedido-page">
      <div className="success-card">
        <h1>Pedido recibido</h1>

        <p>Gracias por tu compra.</p>

        <h3>Pedido:</h3>

        <strong>
          #{order.id.slice(0, 8)}
        </strong>

        {order.delivery_cycle?.delivery_date && (
          <div className="pedido-delivery-date">
            <span>Entrega programada</span>
            <strong>
              {formatDeliveryDate(order.delivery_cycle.delivery_date)}
            </strong>
          </div>
        )}

        <div className="pedido-items">
          {order.order_item.map((item) => {
            const price = Number(item.price);
            const quantity = Number(item.quantity);
            const maturityLabel = getMaturityLabel(
              item.maturity_preference
            );

            return (
              <div
                key={item.id}
                className="pedido-item"
              >
                <span>
                  {item.product_name}
                  {" x "}
                  {quantity}
                  {maturityLabel && (
                    <small
                      style={{
                        display: "block",
                        marginTop: "0.25rem",
                        color: "#6b7280",
                      }}
                    >
                      Maduración: {maturityLabel}
                    </small>
                  )}
                </span>

                <strong>
                  ₡
                  {(price * quantity).toLocaleString("es-CR")}
                </strong>
              </div>
            );
          })}
        </div>

        {order.customer_notes && (
          <div
            style={{
              margin: "1rem 0",
              padding: "1rem",
              background: "#faf8f2",
              borderRadius: "12px",
            }}
          >
            <strong>Notas para el pedido</strong>
            <p style={{ margin: "0.4rem 0 0" }}>
              {order.customer_notes}
            </p>
          </div>
        )}

        <hr />

        <div>
          Subtotal:{" "}
          <strong>
            ₡{Number(order.subtotal).toLocaleString("es-CR")}
          </strong>
        </div>

        {order.shipping > 0 && (
          <div>
            Envío:{" "}
            <strong>
              ₡{Number(order.shipping).toLocaleString("es-CR")}
            </strong>
          </div>
        )}

        <div>
          Total:{" "}
          <strong>
            ₡{Number(order.total).toLocaleString("es-CR")}
          </strong>
        </div>

        <div className="payment-box">
          <h3>Pago por SINPE</h3>

          <p>
            Envía el comprobante al WhatsApp:
          </p>

          <strong>8652-6792</strong>
        </div>

        <Link href="/productos">
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}
