"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { getMaturityLabel } from "@/lib/maturity";
import { DELIVERY_FEE_CRC, formatCRC } from "@/lib/deliveryFee";

export default function CartSummary() {
  const {
    cart,
    totalPrice,
  } = useCart();

  const estimatedTotal = totalPrice + DELIVERY_FEE_CRC;

  return (
    <aside className="cart-summary">
      <h2>Resumen del pedido</h2>

      <div className="summary-products">
        {cart.map((item) => {
          const maturityLabel = getMaturityLabel(
            item.maturity_preference
          );

          return (
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

                {maturityLabel && (
                  <span className="summary-details">
                    Maduración: {maturityLabel}
                  </span>
                )}
              </div>

              <strong className="summary-price">
                ₡{(item.price * item.quantity).toLocaleString("es-CR")}
              </strong>
            </div>
          );
        })}
      </div>

      <hr className="summary-divider" />

      <div className="summary-row">
        <span>Subtotal</span>
        <strong>{formatCRC(totalPrice)}</strong>
      </div>

      <div className="summary-row summary-shipping">
        <span>Envío</span>
        <strong>{formatCRC(DELIVERY_FEE_CRC)}</strong>
      </div>

      <div className="summary-row summary-total">
        <span>Total estimado</span>
        <strong>{formatCRC(estimatedTotal)}</strong>
      </div>

      <p className="summary-checkout-note">
        El total final se confirma en checkout junto con tu dirección de entrega.
      </p>

      <Link
        href="/checkout"
        className="checkout-btn"
      >
        Continuar con la compra
      </Link>
    </aside>
  );
}
