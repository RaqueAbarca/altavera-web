"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ShoppingList from "@/components/admin/ShoppingList";
import { useRouter } from "next/navigation";
import "../admin.css";

type OrderItem = {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  guest_name: string;
  guest_phone: string;
  total: number;
  status: string;
  created_at: string;
  items: OrderItem[];
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // CORRECCIÓN: Declaramos el router de forma correcta aquí dentro
  const router = useRouter();

  async function loadOrders() {
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("ERROR PEDIDOS:", error);
      return;
    }

    const ordersWithItems = await Promise.all(
      (ordersData || []).map(async (order) => {
        const { data: items, error: itemError } = await supabase
          .from("order_item")
          .select("*")
          .eq("order_id", order.id);

        if (itemError) {
          console.error("ERROR ITEMS:", itemError);
        }

        return {
          ...order,
          items: items || [],
        };
      })
    );

    setOrders(ordersWithItems);
    setLoading(false);
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin"); // Si detecta que no hay sesión, lo saca
        return;
      }
      // Solo cargamos los pedidos si la sesión es válida
      loadOrders();
    };
    checkAuth();
  }, []);

  async function updateStatus(order: Order, status: string) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id)
      .select();

    if (error) {
      console.error("ERROR CAMBIANDO ESTADO:", error);
      return;
    }

    const { data: functionData, error: functionError } =
      await supabase.functions.invoke("order-status", {
        body: {
          orderId: order.id,
          status: status,
          customerName: order.guest_name,
          phone: order.guest_phone,
          total: order.total
        }
      });

    await loadOrders();
  }

  // Función para cerrar sesión limpiamente
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/admin"; // Redirección limpia para limpiar cookies del servidor
  }

  const shoppingMap: Record<string, number> = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      shoppingMap[item.product_name] =
        (shoppingMap[item.product_name] || 0) + item.quantity;
    });
  });

  const shoppingProducts = Object.entries(shoppingMap).map(
    ([name, quantity]) => ({
      name,
      quantity,
    })
  );

  if (loading) {
    return (
      <main className="admin-container">
        <p>Cargando pedidos...</p>
      </main>
    );
  }

  return (
    <main className="admin-container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Panel de pedidos</h1>
        <button 
          onClick={handleLogout} 
          style={{ padding: "0.5rem 1rem", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          🚪 Cerrar Sesión
        </button>
      </header>

      <ShoppingList products={shoppingProducts} />

      <section className="orders-section">
        <h2>Pedidos recibidos</h2>

        {orders.length === 0 ? (
          <p>No hay pedidos todavía.</p>
        ) : (
          orders.map((order) => (
            <article className="order-card" key={order.id}>
              <h3>Pedido #{order.id.slice(0, 8)}</h3>
              <p>Cliente: {order.guest_name}</p>
              <p>Teléfono: {order.guest_phone}</p>

              <h4>Productos</h4>
              {order.items.length === 0 ? (
                <p>Sin productos</p>
              ) : (
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.product_name} x {item.quantity} - ₡{item.price}
                    </li>
                  ))}
                </ul>
              )}

              <p>Total: ₡{order.total}</p>
              <p>Estado: {order.status}</p>

              <div className="order-actions">
                <button onClick={() => updateStatus(order, "preparing")}>👨‍🍳 Preparando</button>
                <button onClick={() => updateStatus(order, "ready")}>✅ Listo</button>
                <button onClick={() => updateStatus(order, "delivered")}>🚚 Entregado</button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}