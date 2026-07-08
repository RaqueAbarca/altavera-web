"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import LocationPicker from "@/components/checkout/LocationPicker";
import { createOrder } from "./createOrder";
import type { GuestLocation, GuestOrder } from "./types";
export default function GuestForm(){

  const {
    cart,
    totalPrice,
    clearCart
  } = useCart();

  const router = useRouter();

  const [loading,setLoading] = useState(false);

  const [location,setLocation] =
  useState<GuestLocation>({
    lat:0,
    lng:0
  });

  async function handleSubmit(
    e: any
  ){

    e.preventDefault();

    if(loading) return;

    if(cart.length === 0){
      alert(
        "Tu carrito está vacío."
      );
      return;
    }

    if(
      location.lat === 0 &&
      location.lng === 0
    ){

      alert(
        "Selecciona una ubicación de entrega."
      );
      return;
    }

    setLoading(true);

    try{

      const form =
      e.currentTarget as HTMLFormElement;

      const data =
      new FormData(form);

      const order:GuestOrder = {

        guest_name:
        data.get("name"),

        guest_phone:
        data.get("phone"),

        guest_email:
        data.get("email"),

        latitude:
        location.lat,

        longitude:
        location.lng,

        address_description:
        data.get("address"),

        subtotal:
        totalPrice,

        shipping:
        0,

        total:
        totalPrice,

        payment_method:
        "SINPE",

        status:
        "pending_payment"
      };

      const createdOrder =
      await createOrder({
        order,
        cart
      });

      clearCart();

      router.push(
        `/pedido/${createdOrder.id}`
      );
    }

    catch(error){
      console.error(
        "ERROR CREANDO PEDIDO:",
        error
      );

      alert(
        "Hubo un error creando el pedido."
      );
    }
    finally{
      setLoading(false);
    }
  }

  return (

    <form
      className="guest-form"
      onSubmit={handleSubmit}
    >
      <h2>
        Datos del cliente
      </h2>

      <label>
        Nombre completo
        <input
          type="text"
          name="name"
          placeholder="Ej: María Rodríguez"
          required
        />
      </label>

      <label>

        WhatsApp

        <input
          type="tel"
          name="phone"
          placeholder="8888-8888"
          required
        />
      </label>

      <label>
        Correo
        <input
          type="email"
          name="email"
          placeholder="correo@email.com"
        />
      </label>

      <h2>
        Dirección de entrega
      </h2>
      <LocationPicker

        onChange={(lat,lng)=>
          setLocation({
            lat,
            lng

          })
        }
      />

      <p>
        Latitud:
        {location.lat}
        <br/>
        Longitud:
        {location.lng}
      </p>

      <label>
        Descripción de ubicación

        <textarea
          name="address"
          placeholder="Condominio, número de casa, colores, 100m norte de..."
        />

      </label>

      <button
        type="submit"
        className="checkout-btn"
        disabled={loading}
      >

        {
          loading
          ? "Creando pedido..."
          : "Continuar"
        }

      </button>
    </form>

  );
}