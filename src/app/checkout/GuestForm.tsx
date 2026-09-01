"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/hooks/useCart";
import LocationPicker from "@/components/checkout/LocationPicker";
import { createOrder } from "./createOrder";
import type { GuestLocation, OrderInput } from "./types";
import "./orderExtras.css";

export default function GuestForm() {
  const { cart, totalPrice, clearCart } = useCart();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [location, setLocation] = useState<GuestLocation>({
    lat: 0,
    lng: 0,
  });

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
      }

      setCheckingAuth(false);
    };

    checkUser();
  }, []);

  async function handleSubmit(e: any) {
    e.preventDefault();

    if (loading) return;

    if (cart.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    if (location.lat === 0 && location.lng === 0) {
      alert("Selecciona una ubicación de entrega.");
      return;
    }

    setLoading(true);

    try {
      const form = e.currentTarget as HTMLFormElement;
      const data = new FormData(form);

      const order: OrderInput = {
        guest_name: String(data.get("name") ?? "").trim(),
        guest_phone: String(data.get("phone") ?? "").trim(),
        guest_email:
          String(data.get("email") ?? "").trim() || null,
        latitude: location.lat,
        longitude: location.lng,
        address_description:
          String(data.get("address") ?? "").trim() || null,
        customer_notes:
          String(data.get("customer_notes") ?? "").trim() || null,
      };

      const createdOrder = await createOrder({
        order,
        cart,
      });

      clearCart();
      router.push(
        `/pedido/${createdOrder.id}#token=${createdOrder.accessToken}`
      );
    } catch (error) {
      console.error("ERROR CREANDO PEDIDO:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Hubo un error creando el pedido."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return <p>Cargando datos del cliente...</p>;
  }

  return (
    <form className="guest-form" onSubmit={handleSubmit}>
      {!user && (
        <div
          style={{
            backgroundColor: "var(--cream)",
            borderLeft: "4px solid var(--orange)",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
            color: "var(--text)",
          }}
        >
          <strong>¿Ya tienes una cuenta?</strong>{" "}
          <span
            onClick={() =>
              router.push("/login?redirect=checkout")
            }
            style={{
              color: "var(--orange)",
              cursor: "pointer",
              fontWeight: "bold",
              textDecoration: "underline",
            }}
          >
            Inicia sesión aquí
          </span>{" "}
          para autocompletar tus datos y seguir tu orden en tiempo real.
        </div>
      )}

      <h2>Datos del cliente</h2>

      <label>
        Nombre completo
        <input
          type="text"
          name="name"
          placeholder="Ej: María Rodríguez"
          required
          defaultValue={user?.user_metadata?.full_name || ""}
        />
      </label>

      <label>
        WhatsApp
        <input
          type="tel"
          name="phone"
          placeholder="8888-8888"
          required
          defaultValue={user?.user_metadata?.phone || ""}
        />
      </label>

      <label>
        Correo
        <input
          type="email"
          name="email"
          placeholder="correo@email.com"
          defaultValue={user?.email || ""}
        />
      </label>

      <h2>Dirección de entrega</h2>

      <LocationPicker
        onChange={(lat, lng) =>
          setLocation({
            lat,
            lng,
          })
        }
      />

      <p style={{ fontSize: "0.85rem", color: "var(--gray)" }}>
        Latitud: {location.lat}
        <br />
        Longitud: {location.lng}
      </p>

      <label>
        Descripción de ubicación
        <textarea
          name="address"
          placeholder="Condominio, número de casa, colores, 100m norte de..."
        />
      </label>

      <div className="order-notes-field">
        <label htmlFor="customer-notes">
          Notas para tu pedido
          <span>Opcional</span>
        </label>

        <textarea
          id="customer-notes"
          name="customer_notes"
          maxLength={1000}
          placeholder="Ej: si falta un producto no sustituirlo, prefiero piezas pequeñas, dejar en recepción..."
        />

        <p>
          Usa este espacio para indicaciones generales. La maduración de cada producto se selecciona desde el carrito.
        </p>
      </div>

      <button
        type="submit"
        className="checkout-btn"
        disabled={loading}
      >
        {loading
          ? "Creando pedido..."
          : "Confirmar y pagar ₡" + totalPrice}
      </button>
    </form>
  );
}
