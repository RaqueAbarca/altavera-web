"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/hooks/useCart";
import LocationPicker from "@/components/checkout/LocationPicker";
import { createOrder } from "./createOrder";
import type { GuestLocation, GuestOrder } from "./types";

export default function GuestForm() {
  const { cart, totalPrice, clearCart } = useCart();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null); // Guardará la sesión del usuario si existe
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [location, setLocation] = useState<GuestLocation>({
    lat: 0,
    lng: 0,
  });

  // Verificar si el cliente ya está logueado al cargar la página
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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

      const order: GuestOrder = {
        // Enlazamos el ID si está logueado, de lo contrario viaja como null (invitado)
        user_id: user ? user.id : null, 

        guest_name: data.get("name"),
        guest_phone: data.get("phone"),
        guest_email: data.get("email"),
        latitude: location.lat,
        longitude: location.lng,
        address_description: data.get("address"),
        subtotal: totalPrice,
        shipping: 0,
        total: totalPrice,
        payment_method: "SINPE",
        status: "pending_payment",
      };

      const createdOrder = await createOrder({
        order,
        cart,
      });

      clearCart();
      router.push(`/pedido/${createdOrder.id}`);
    } catch (error) {
      console.error("ERROR CREANDO PEDIDO:", error);
      alert("Hubo un error creando el pedido.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return <p>Cargando datos del cliente...</p>;
  }

  return (
    <form className="guest-form" onSubmit={handleSubmit}>
      
      {/* BANNER DE UX INTELIGENTE: Solo aparece si el usuario está comprando como invitado */}
      {!user && (
        <div style={{
          backgroundColor: "var(--cream)",
          borderLeft: "4px solid var(--orange)",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
          color: "var(--text)"
        }}>
          💡 <strong>¿Ya tienes una cuenta?</strong>{" "}
          <span 
            onClick={() => router.push("/login?redirect=checkout")} 
            style={{ color: "var(--orange)", cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}
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
          // Si está logueado, saca el nombre de los metadatos que guardamos en el registro
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
          // Si está logueado, auto-rellena con el teléfono guardado
          defaultValue={user?.user_metadata?.phone || ""}
        />
      </label>

      <label>
        Correo
        <input
          type="email"
          name="email"
          placeholder="correo@email.com"
          // Si está logueado, auto-rellena el correo de la cuenta de Supabase
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

      <button type="submit" className="checkout-btn" disabled={loading}>
        {loading ? "Creando pedido..." : "Confirmar y pagar ₡" + totalPrice}
      </button>
    </form>
  );
}