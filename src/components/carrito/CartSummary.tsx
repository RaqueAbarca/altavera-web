"use client";

import { useCart } from "@/hooks/useCart";

export default function CartSummary() {

  const {
    totalItems,
    totalPrice,
  } = useCart();

  return (

    <aside className="cart-summary">

      <h2>Resumen</h2>

      <div className="summary-row">
        <span>Productos</span>
        <strong>{totalItems}</strong>
      </div>

      <div className="summary-row">
        <span>Total</span>
        <strong>
          ₡{totalPrice.toLocaleString()}
        </strong>
      </div>

      <button className="checkout-btn">
        Continuar compra
      </button>

    </aside>

  );
}