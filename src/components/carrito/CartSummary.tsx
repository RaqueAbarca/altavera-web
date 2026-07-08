"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";

export default function CartSummary() {
  const {
    cart,
    totalPrice,
  } = useCart();

  return (
    <aside className="cart-summary">

      <h2>Resumen del pedido</h2>

      <div className="summary-products">

        {cart.map((item) => (

          <div
            key={item.id}
            className="summary-item"
          >

            <div className="summary-info">

              <span className="summary-name">
                {item.name}
              </span>

              <span className="summary-details">
                {item.quantity} × ₡{item.price.toLocaleString("es-CR")}
              </span>

            </div>

            <strong className="summary-price">
              ₡{(item.price * item.quantity).toLocaleString("es-CR")}
            </strong>

          </div>

        ))}

      </div>

      <hr className="summary-divider" />

      <div className="summary-row summary-total">

        <span>Subtotal</span>

        <strong>
          ₡{totalPrice.toLocaleString("es-CR")}
        </strong>

      </div>

      <Link
        href="/checkout"
        className="checkout-btn"
        >
        Continuar con la compra
      </Link>

    </aside>
  );
}