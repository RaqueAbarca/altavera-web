"use client";

import { useEffect, useMemo, useState } from "react";
import { getMaturityLabel } from "@/lib/maturity";

type ProductCount = {
  name: string;
  quantity: number;
  unit?: string | null;
  category?: string | null;
  maturityPreference?: string | null;
};

type Props = {
  products: ProductCount[];
  title?: string;
  subtitle?: string;
  printContext?: string;
};

function categoryLabel(category?: string | null) {
  const value = category?.trim();
  return value || "Otros";
}

export default function ShoppingList({
  products,
  title = "Lista de compras",
  subtitle,
  printContext,
}: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const grouped = new Map<string, ProductCount[]>();

    products.forEach((product) => {
      const category = categoryLabel(product.category);
      const current = grouped.get(category) ?? [];
      current.push(product);
      grouped.set(category, current);
    });

    return [...grouped.entries()]
      .sort(([a], [b]) => {
        if (a === "Otros") return 1;
        if (b === "Otros") return -1;
        return a.localeCompare(b, "es");
      })
      .map(([category, items]) => ({
        category,
        items: [...items].sort((a, b) => a.name.localeCompare(b.name, "es")),
      }));
  }, [products]);

  function itemKey(product: ProductCount, index: number) {
    return `${product.category ?? "otros"}::${product.name}::${product.maturityPreference ?? "none"}::${index}`;
  }

  useEffect(() => {
    setChecked({});
  }, [products]);

  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <section className="shopping-list shopping-list-purchasing">
      <div className="shopping-list-header-row">
        <div className="shopping-list-heading">
          <span className="shopping-list-print-brand">ALTAVERA · LISTA DE COMPRA</span>
          <h2>{title}</h2>
          {subtitle && <p className="shopping-list-screen-subtitle">{subtitle}</p>}
          {printContext && (
            <p className="shopping-list-print-context">{printContext}</p>
          )}
        </div>

        {products.length > 0 && (
          <button
            type="button"
            className="shopping-list-print-button"
            onClick={() => window.print()}
          >
            Imprimir lista
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <p className="empty">No hay productos para esta entrega.</p>
      ) : (
        <>
          <div className="shopping-list-progress" aria-live="polite">
            <strong>{checkedCount} de {products.length}</strong> productos marcados
          </div>

          <p className="shopping-list-print-instruction">
            Marcá cada producto conforme lo comprás.
          </p>

          <div className="shopping-category-groups">
            {groups.map((group) => (
              <section className="shopping-category-group" key={group.category}>
                <div className="shopping-category-title">
                  <h3>{group.category}</h3>
                  <span>{group.items.length} {group.items.length === 1 ? "producto" : "productos"}</span>
                </div>

                <ul className="shopping-items shopping-items-categorized">
                  {group.items.map((product, index) => {
                    const key = itemKey(product, index);
                    const maturityLabel = getMaturityLabel(product.maturityPreference);

                    return (
                      <li key={key} className={checked[key] ? "is-checked" : ""}>
                        <label className="shopping-check-control">
                          <input
                            type="checkbox"
                            checked={Boolean(checked[key])}
                            onChange={(event) =>
                              setChecked((current) => ({
                                ...current,
                                [key]: event.target.checked,
                              }))
                            }
                            aria-label={`Marcar ${product.name} como comprado`}
                          />
                          <span className="shopping-checkbox" aria-hidden="true" />
                        </label>

                        <span className="product-name">
                          {product.name}
                          {maturityLabel && (
                            <small>Maduración: {maturityLabel}</small>
                          )}
                        </span>

                        <span className="product-quantity">
                          {product.unit
                            ? `${product.quantity.toLocaleString("es-CR")} ${product.unit}`
                            : `x ${product.quantity.toLocaleString("es-CR")}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
