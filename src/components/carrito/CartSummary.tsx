"use client";

import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { usePublicAppSettings } from "@/hooks/usePublicAppSettings";
import { getMaturityLabel } from "@/lib/maturity";
import { formatCRC } from "@/lib/deliveryFee";

export default function CartSummary() {
  const { cart, totalPrice } = useCart();
  const { settings, loading: settingsLoading, error: settingsError } =
    usePublicAppSettings();

  const deliveryFee = settings.delivery.flatFeeCrc;
  const deliveryConfigured = settings.delivery.configured;
  const estimatedTotal =
    deliveryConfigured && deliveryFee !== null ? totalPrice + deliveryFee : null;

  return (
    <aside className="cart-summary">
      <h2>Resumen del pedido</h2>

      <div className="summary-products">
        {cart.map((item) => {
          const maturityLabel = getMaturityLabel(item.maturity_preference);

          return (
            <div key={item.id} className="summary-item">
              <div className="summary-info">
                <span className="summary-name">{item.name}</span>

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
        <strong>
          {settingsLoading
            ? "Calculando..."
            : deliveryConfigured && deliveryFee !== null
              ? formatCRC(deliveryFee)
              : "Por definir"}
        </strong>
      </div>

      <div className="summary-row summary-total">
        <span>Total estimado</span>
        <strong>{estimatedTotal === null ? "—" : formatCRC(estimatedTotal)}</strong>
      </div>

      <p className="summary-checkout-note">
        {settingsError
          ? "No pudimos consultar la tarifa de envío en este momento."
          : deliveryConfigured
            ? "El total final se confirma en checkout junto con tu dirección de entrega."
            : "La tarifa de envío debe configurarse antes de completar una compra."}
      </p>

      <Link href="/checkout" className="checkout-btn">
        Continuar con la compra
      </Link>
    </aside>
  );
}
