"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ReorderButton from "@/components/profile/ReorderButton";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
};

type RecentOrdersProps = {
  limit?: number | null;
  title?: string;
  showHistoryLink?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pago por confirmar",
  pending_payment: "Pago por confirmar",
  confirmed: "Pago confirmado",
  preparing: "Preparando",
  ready: "En camino",
  delivered: "Entregado",
};

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function RecentOrders({
  limit = 3,
  title = "Mis pedidos",
  showHistoryLink = true,
}: RecentOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("orders")
      .select("id,status,total,created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("ERROR HISTORIAL:", error);
      setLoading(false);
      return;
    }

    const ordersWithItems = await Promise.all(
      (data || []).map(async (order) => {
        const { data: items, error: itemError } = await supabase
          .from("order_item")
          .select("id,product_name,quantity,price")
          .eq("order_id", order.id);

        if (itemError) {
          console.error("ERROR PRODUCTOS PEDIDO:", itemError);
        }

        return {
          ...order,
          total: Number(order.total),
          items: (items ?? []).map((item) => ({
            ...item,
            quantity: Number(item.quantity),
            price: Number(item.price),
          })),
        };
      })
    );

    setOrders(ordersWithItems);
    setLoading(false);
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  return (
    <section className="profile-card profile-orders-card">
      <div className="profile-orders-heading">
        <div>
          <h2>{title}</h2>
          {!loading && orders.length > 0 && (
            <p>
              Puedes volver a agregar un pedido anterior usando los precios
              actuales.
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando pedidos...</p>
      ) : orders.length === 0 ? (
        <p>Todavía no tienes pedidos.</p>
      ) : (
        <div className="profile-orders-list">
          {orders.map((order) => (
            <article className="profile-order" key={order.id}>
              <div className="order-info">
                <div className="profile-order__title-row">
                  <h3>Pedido #{order.id.slice(0, 8)}</h3>
                  <span className="profile-order__date">
                    {formatOrderDate(order.created_at)}
                  </span>
                </div>

                <ul className="order-products">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.product_name} x {item.quantity}
                    </li>
                  ))}
                </ul>

                <p>
                  Total: ₡{order.total.toLocaleString("es-CR")}
                </p>
              </div>

              <div className="profile-order__side">
                <span className={`status ${order.status}`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>

                <div className="profile-order__actions">
                  <Link
                    href={`/pedido/${order.id}`}
                    className="profile-order-action"
                  >
                    Ver pedido
                  </Link>

                  <ReorderButton orderId={order.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showHistoryLink && orders.length > 0 && (
        <Link href="/pedidos" className="profile-btn profile-link-btn">
          Ver historial completo
        </Link>
      )}
    </section>
  );
}
