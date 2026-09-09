"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ShoppingCart } from "lucide-react";
import { useCartContext } from "@/context/CartContext";
import type { CartItem } from "@/types/cart";

type ReorderResponse = {
  items?: CartItem[];
  unavailableProducts?: string[];
  adjustedProducts?: string[];
  error?: string;
};

type ReorderButtonProps = {
  orderId: string;
};

export default function ReorderButton({ orderId }: ReorderButtonProps) {
  const router = useRouter();
  const { cart, replaceCart, mergeCart } = useCartContext();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preparedItems, setPreparedItems] = useState<CartItem[]>([]);
  const [unavailableProducts, setUnavailableProducts] = useState<string[]>([]);
  const [adjustedProducts, setAdjustedProducts] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dialogOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDialogOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen]);

  async function prepareOrder() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/orders/${orderId}/reorder`, {
        cache: "no-store",
      });
      const data = (await response.json()) as ReorderResponse;

      if (response.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent("/profile")}`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "No pudimos preparar este pedido");
      }

      setPreparedItems(data.items ?? []);
      setUnavailableProducts(data.unavailableProducts ?? []);
      setAdjustedProducts(data.adjustedProducts ?? []);
      setDialogOpen(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No pudimos preparar este pedido"
      );
      setDialogOpen(true);
    } finally {
      setLoading(false);
    }
  }

  function finish(action: "replace" | "merge") {
    if (action === "replace") {
      replaceCart(preparedItems);
    } else {
      mergeCart(preparedItems);
    }

    setDialogOpen(false);
    router.push("/carrito");
  }

  const hasCurrentCart = cart.length > 0;
  const hasPreparedItems = preparedItems.length > 0;

  return (
    <>
      <button
        type="button"
        className="profile-order-action profile-order-action--primary"
        onClick={() => void prepareOrder()}
        disabled={loading}
      >
        <RotateCcw size={15} />
        {loading ? "Preparando..." : "Volver a pedir"}
      </button>

      {dialogOpen && (
        <div
          className="reorder-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setDialogOpen(false);
          }}
        >
          <div
            className="reorder-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`reorder-title-${orderId}`}
          >
            <span className="reorder-dialog__icon" aria-hidden="true">
              <ShoppingCart size={23} />
            </span>

            <h2 id={`reorder-title-${orderId}`}>
              {error ? "No pudimos preparar el pedido" : "¿Volver a pedir?"}
            </h2>

            {error ? (
              <p>{error}</p>
            ) : hasPreparedItems ? (
              <>
                <p>
                  Agregaremos {preparedItems.length}{" "}
                  {preparedItems.length === 1 ? "producto" : "productos"} con
                  sus precios y presentaciones actuales.
                </p>

                {unavailableProducts.length > 0 && (
                  <div className="reorder-dialog__notice">
                    <strong>No están disponibles ahora:</strong>{" "}
                    {unavailableProducts.join(", ")}.
                  </div>
                )}

                {adjustedProducts.length > 0 && (
                  <div className="reorder-dialog__notice">
                    <strong>Ajustamos la cantidad a la presentación actual:</strong>{" "}
                    {adjustedProducts.join(", ")}.
                  </div>
                )}

                {hasCurrentCart && (
                  <p className="reorder-dialog__cart-note">
                    Ya tienes productos en el carrito. Puedes reemplazarlos o
                    sumar este pedido a lo que ya tienes.
                  </p>
                )}
              </>
            ) : (
              <p>
                Ninguno de los productos de este pedido está disponible en el
                catálogo actual.
              </p>
            )}

            <div className="reorder-dialog__actions">
              <button
                type="button"
                className="reorder-dialog__cancel"
                onClick={() => setDialogOpen(false)}
              >
                {error || !hasPreparedItems ? "Cerrar" : "Cancelar"}
              </button>

              {!error && hasPreparedItems && hasCurrentCart && (
                <button
                  type="button"
                  className="reorder-dialog__secondary"
                  onClick={() => finish("replace")}
                >
                  Reemplazar carrito
                </button>
              )}

              {!error && hasPreparedItems && (
                <button
                  type="button"
                  className="reorder-dialog__confirm"
                  onClick={() => finish(hasCurrentCart ? "merge" : "replace")}
                >
                  {hasCurrentCart ? "Sumar al carrito" : "Agregar al carrito"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
