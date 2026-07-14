"use client";

import Link from "next/link";
import "./checkout.css";
import GuestForm from "./GuestForm";

export default function CheckoutPage() {
  return (
    <main className="checkout-page container">
      <Link href="/carrito" className="back-link">
        ← Volver al carrito
      </Link>

      <h1>Finalizar compra</h1>

      {/* Renderizamos el formulario unificado directamente */}
      <GuestForm />
    </main>
  );
}