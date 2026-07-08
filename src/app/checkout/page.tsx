"use client";

import { useState } from "react";
import Link from "next/link";
import "./checkout.css";
import GuestForm from "./GuestForm";


export default function CheckoutPage() {

  const [guest, setGuest] = useState(false);


  return (

    <main className="checkout-page container">

      <Link
        href="/carrito"
        className="back-link"
      >
        ← Volver al carrito
      </Link>


      <h1>
        Finalizar compra
      </h1>


      {!guest ? (

        <section className="checkout-options">

          <div className="checkout-card">

            <h2>
              Comprar como invitado
            </h2>

            <p>
              No necesitas crear una cuenta.
            </p>

            <button
              onClick={() => setGuest(true)}
            >
              Continuar
            </button>

          </div>


          <div className="checkout-card">

            <h2>
              Iniciar sesión
            </h2>

            <p>
              Accede a tu historial de pedidos.
            </p>

            <button>
              Iniciar sesión
            </button>

          </div>

        </section>

      ) : (

        <GuestForm />

      )}

    </main>

  );

}