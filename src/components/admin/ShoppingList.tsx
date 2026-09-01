"use client";

import { getMaturityLabel } from "@/lib/maturity";

type ProductCount = {
  name: string;
  quantity: number;
  maturityPreference?: string | null;
};

type Props = {
  products: ProductCount[];
};

export default function ShoppingList({
  products,
}: Props) {
  return (
    <section className="shopping-list">
      <h2>Lista de compras</h2>

      {products.length === 0 ? (
        <p className="empty">
          No hay productos pendientes.
        </p>
      ) : (
        <ul className="shopping-items">
          {products.map((product, index) => {
            const maturityLabel = getMaturityLabel(
              product.maturityPreference
            );

            return (
              <li key={`${product.name}-${product.maturityPreference ?? "none"}-${index}`}>
                <span className="product-name">
                  {product.name}
                  {maturityLabel && (
                    <small
                      style={{
                        display: "block",
                        marginTop: "0.2rem",
                        color: "#6b7280",
                        fontWeight: 500,
                      }}
                    >
                      Maduración: {maturityLabel}
                    </small>
                  )}
                </span>

                <span className="product-quantity">
                  x {product.quantity}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
