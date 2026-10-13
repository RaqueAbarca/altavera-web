"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { formatCRC } from "@/lib/deliveryFee";
import {
  clearStoredPromoCode,
  readStoredPromoCode,
  saveStoredPromoCode,
  type StoredPromoCode,
} from "@/lib/promoStorage";

export default function CatalogCartSidebar() {
  const { cart, totalPrice } = useCart();
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<StoredPromoCode | null>(null);

  useEffect(() => {
    const stored = readStoredPromoCode();
    if (!stored) return;

    setPromoInput(stored.code);
    setAppliedPromo(stored);

    void validateStoredPromo(stored.code);
  }, []);

  async function validateStoredPromo(code: string) {
    try {
      const response = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();

      if (!response.ok || !data.valid) {
        clearStoredPromoCode();
        setAppliedPromo(null);
        setPromoInput("");
        return;
      }

      const promo: StoredPromoCode = {
        code: data.code,
        label: data.label || "Envío gratis",
        discountType: "free_shipping",
      };
      setPromoInput(promo.code);
      setAppliedPromo(promo);
      saveStoredPromoCode(promo);
    } catch {
      // Si falla la comprobación silenciosa, mantenemos el código para volver a validarlo en checkout.
    }
  }

  async function applyPromoCode() {
    const code = promoInput.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) {
      setPromoMessage("Escribí un código promocional.");
      return;
    }

    setPromoLoading(true);
    setPromoMessage("");

    try {
      const response = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();

      if (!response.ok || !data.valid) {
        clearStoredPromoCode();
        setAppliedPromo(null);
        throw new Error(data.error ?? "Código promocional inválido o no disponible.");
      }

      const promo: StoredPromoCode = {
        code: data.code,
        label: data.label || "Envío gratis",
        discountType: "free_shipping",
      };

      setPromoInput(promo.code);
      setAppliedPromo(promo);
      setPromoMessage("Envío gratis aplicado.");
      saveStoredPromoCode(promo);
    } catch (error) {
      setPromoMessage(
        error instanceof Error
          ? error.message
          : "No se pudo validar el código promocional."
      );
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromoCode() {
    clearStoredPromoCode();
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMessage("");
  }

  return (
    <>
      <aside className="catalog-cart-sidebar" aria-label="Resumen del carrito">
        <div className="catalog-cart-sidebar__inner">
          <h2>Tu carrito</h2>

          {cart.length === 0 ? (
            <p className="catalog-cart-sidebar__empty">
              Tu próxima compra empieza aquí.
            </p>
          ) : (
            <div className="catalog-cart-sidebar__items">
              {cart.slice(0, 4).map((item) => (
                <div key={item.id} className="catalog-cart-sidebar__item">
                  <div>
                    <strong>{item.name}</strong>
                    {item.variant_label && (
                      <span>{item.variant_label}{item.variant_weight_label ? ` · ${item.variant_weight_label}` : ""}</span>
                    )}
                    <span>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <span>{formatCRC(item.price * item.quantity)}</span>
                </div>
              ))}
              {cart.length > 4 && (
                <p className="catalog-cart-sidebar__more">
                  + {cart.length - 4} producto{cart.length - 4 === 1 ? "" : "s"} más
                </p>
              )}
            </div>
          )}

          <div className="catalog-cart-sidebar__subtotal">
            <span>Subtotal</span>
            <strong>{formatCRC(totalPrice)}</strong>
          </div>

          <div className="catalog-cart-sidebar__shipping">
            {appliedPromo ? (
              <>
                <strong>Envío gratis</strong>
                <span>con código {appliedPromo.code}</span>
              </>
            ) : (
              <span>El envío se calcula según tu dirección.</span>
            )}
          </div>

          <div className="catalog-cart-sidebar__promo">
            <span className="catalog-cart-sidebar__promo-label">
              ¿Tenés un código promocional?
            </span>

            {appliedPromo ? (
              <div className="catalog-cart-sidebar__promo-applied">
                <div>
                  <strong>{appliedPromo.code}</strong>
                  <span>{appliedPromo.label}</span>
                </div>
                <button type="button" onClick={removePromoCode}>
                  Quitar
                </button>
              </div>
            ) : (
              <div className="catalog-cart-sidebar__promo-controls">
                <input
                  value={promoInput}
                  onChange={(event) => {
                    setPromoInput(event.target.value.toUpperCase().replace(/\s/g, ""));
                    setPromoMessage("");
                  }}
                  placeholder="Ej. FAMILIA"
                  maxLength={40}
                  autoComplete="off"
                  aria-label="Código promocional"
                />
                <button type="button" onClick={applyPromoCode} disabled={promoLoading}>
                  {promoLoading ? "..." : "Aplicar"}
                </button>
              </div>
            )}

            {promoMessage && (
              <small className={appliedPromo ? "is-success" : "is-error"}>
                {promoMessage}
              </small>
            )}
          </div>

          {cart.length > 0 ? (
            <Link href="/carrito" className="catalog-cart-sidebar__review">
              Revisar pedido <ArrowRight size={17} />
            </Link>
          ) : (
            <span className="catalog-cart-sidebar__review catalog-cart-sidebar__review--disabled">
              Revisar pedido <ArrowRight size={17} />
            </span>
          )}
        </div>
      </aside>

      {cart.length > 0 && (
        <div className="catalog-cart-mobilebar">
          <div>
            <span>{cart.length} producto{cart.length === 1 ? "" : "s"}</span>
            <strong>{formatCRC(totalPrice)}</strong>
          </div>
          <Link href="/carrito">
            Ver carrito <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </>
  );
}
