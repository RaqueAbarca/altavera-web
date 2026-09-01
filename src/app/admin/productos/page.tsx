"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "./productos-admin.css";

type Product = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  unit: string | null;
  image_url: string | null;
  featured: boolean | null;
  is_active: boolean;
  is_seasonal: boolean;
  maturity_selection_enabled: boolean;
};

type Filter = "all" | "active" | "inactive" | "seasonal";

type ProductForm = {
  name: string;
  description: string;
  category: string;
  unit: string;
  imageUrl: string;
  price: string;
  isActive: boolean;
  isSeasonal: boolean;
  maturitySelectionEnabled: boolean;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  description: "",
  category: "",
  unit: "",
  imageUrl: "",
  price: "",
  isActive: false,
  isSeasonal: false,
  maturitySelectionEnabled: false,
};

function formatPrice(value: number | null) {
  if (value === null) {
    return "Sin precio";
  }

  return `₡${value.toLocaleString("es-CR")}`;
}

export default function AdminProductosPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [savingForm, setSavingForm] = useState(false);

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/products", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los productos");
      }

      setProducts(data.products ?? []);
    } catch (loadError) {
      console.error("Error cargando productos admin:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los productos"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) => product.category?.trim())
          .filter((category): category is string => Boolean(category))
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const counts = useMemo(() => {
    return {
      all: products.length,
      active: products.filter((product) => product.is_active).length,
      inactive: products.filter((product) => !product.is_active).length,
      seasonal: products.filter((product) => product.is_seasonal).length,
    };
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      if (filter === "active" && !product.is_active) {
        return false;
      }

      if (filter === "inactive" && product.is_active) {
        return false;
      }

      if (filter === "seasonal" && !product.is_seasonal) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [product.name, product.category, product.unit]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch)
        );
    });
  }, [products, filter, search]);

  function replaceProduct(updated: Product) {
    setProducts((current) =>
      current.map((product) =>
        product.id === updated.id ? updated : product
      )
    );
  }

  async function patchProduct(
    product: Product,
    payload: Record<string, unknown>,
    successMessage: string
  ) {
    setWorkingId(product.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar el producto");
      }

      replaceProduct(data.product);
      setMessage(successMessage);
    } catch (updateError) {
      console.error("Error actualizando producto:", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar el producto"
      );
    } finally {
      setWorkingId(null);
    }
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setShowCreate(false);
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category ?? "",
      unit: product.unit ?? "",
      imageUrl: product.image_url ?? "",
      price: product.price?.toString() ?? "",
      isActive: product.is_active,
      isSeasonal: product.is_seasonal,
      maturitySelectionEnabled: product.maturity_selection_enabled,
    });
    setMessage("");
    setError("");
  }

  function openCreate() {
    setEditingProduct(null);
    setShowCreate(true);
    setForm(EMPTY_FORM);
    setMessage("");
    setError("");
  }

  function closeForm() {
    setEditingProduct(null);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingForm(true);
    setMessage("");
    setError("");

    const isCreating = showCreate && !editingProduct;

    try {
      const endpoint = isCreating
        ? "/api/admin/products"
        : `/api/admin/products/${editingProduct!.id}`;

      const body = isCreating
        ? {
            name: form.name,
            description: form.description,
            category: form.category,
            unit: form.unit,
            imageUrl: form.imageUrl,
            price: Number(form.price),
            isActive: form.isActive,
            isSeasonal: form.isSeasonal,
            maturitySelectionEnabled: form.maturitySelectionEnabled,
          }
        : {
            name: form.name,
            description: form.description,
            category: form.category,
            unit: form.unit,
            imageUrl: form.imageUrl,
            isActive: form.isActive,
            isSeasonal: form.isSeasonal,
            maturitySelectionEnabled: form.maturitySelectionEnabled,
          };

      const response = await fetch(endpoint, {
        method: isCreating ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            (isCreating
              ? "No se pudo crear el producto"
              : "No se pudo guardar el producto")
        );
      }

      if (isCreating) {
        setProducts((current) =>
          [...current, data.product].sort((a, b) =>
            a.name.localeCompare(b.name, "es")
          )
        );
        setMessage(`${data.product.name} fue creado correctamente.`);
      } else {
        replaceProduct(data.product);
        setMessage(`${data.product.name} fue actualizado.`);
      }

      closeForm();
    } catch (saveError) {
      console.error("Error guardando producto:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el producto"
      );
    } finally {
      setSavingForm(false);
    }
  }

  return (
    <main className="products-admin-page">
      <div className="products-admin-shell">
        <header className="products-admin-header">
          <div>
            <button
              type="button"
              className="products-admin-back"
              onClick={() => router.push("/admin/dashboard")}
            >
              ← Volver al panel
            </button>

            <h1>Productos</h1>
            <p>
              Administra disponibilidad, temporada, maduración e información
              del catálogo sin entrar a Supabase.
            </p>
          </div>

          <button
            type="button"
            className="products-admin-create"
            onClick={openCreate}
          >
            + Nuevo producto
          </button>
        </header>

        <section className="products-admin-summary">
          <article>
            <span>Total</span>
            <strong>{counts.all}</strong>
          </article>
          <article>
            <span>Activos</span>
            <strong>{counts.active}</strong>
          </article>
          <article>
            <span>Inactivos</span>
            <strong>{counts.inactive}</strong>
          </article>
          <article className="seasonal-summary">
            <span>De temporada</span>
            <strong>{counts.seasonal}</strong>
          </article>
        </section>

        <section className="products-admin-toolbar">
          <input
            type="search"
            placeholder="Buscar por nombre, categoría o unidad..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="products-admin-filters">
            {(
              [
                ["all", `Todos (${counts.all})`],
                ["active", `Activos (${counts.active})`],
                ["inactive", `Inactivos (${counts.inactive})`],
                ["seasonal", `Temporada (${counts.seasonal})`],
              ] as Array<[Filter, string]>
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {message && <p className="products-admin-message">{message}</p>}
        {error && <p className="products-admin-error">{error}</p>}

        {loading ? (
          <p className="products-admin-empty">Cargando productos...</p>
        ) : visibleProducts.length === 0 ? (
          <p className="products-admin-empty">
            No hay productos que coincidan con este filtro.
          </p>
        ) : (
          <section className="products-admin-list">
            {visibleProducts.map((product) => {
              const disabled = workingId === product.id;

              return (
                <article
                  key={product.id}
                  className={
                    product.is_seasonal
                      ? "products-admin-card seasonal"
                      : "products-admin-card"
                  }
                >
                  <div className="products-admin-product-main">
                    <div className="products-admin-thumb">
                      <img
                        src={product.image_url || "/logo.svg"}
                        alt={product.name}
                      />
                    </div>

                    <div className="products-admin-product-info">
                      <div className="products-admin-badges">
                        <span
                          className={
                            product.is_active
                              ? "status-badge active"
                              : "status-badge inactive"
                          }
                        >
                          {product.is_active ? "Activo" : "Inactivo"}
                        </span>

                        {product.is_seasonal && (
                          <span className="status-badge seasonal">
                            De temporada
                          </span>
                        )}

                        {product.maturity_selection_enabled && (
                          <span className="status-badge maturity">
                            Con maduración
                          </span>
                        )}
                      </div>

                      <h2>{product.name}</h2>
                      <p>
                        {product.category || "Sin categoría"}
                        {" · "}
                        {product.unit || "Sin unidad"}
                      </p>
                      <strong>{formatPrice(product.price)}</strong>
                    </div>
                  </div>

                  <div className="products-admin-controls">
                    <label className="admin-switch-row">
                      <span>
                        <strong>Disponible en tienda</strong>
                        <small>
                          Al apagarlo desaparece del catálogo sin borrarse.
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={product.is_active}
                        disabled={disabled}
                        onChange={(event) =>
                          patchProduct(
                            product,
                            { isActive: event.target.checked },
                            `${product.name}: disponibilidad actualizada.`
                          )
                        }
                      />
                    </label>

                    <label className="admin-switch-row seasonal-row">
                      <span>
                        <strong>Producto de temporada</strong>
                        <small>
                          Conserva su categoría y además aparece en Temporada.
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={product.is_seasonal}
                        disabled={disabled}
                        onChange={(event) =>
                          patchProduct(
                            product,
                            { isSeasonal: event.target.checked },
                            `${product.name}: temporada actualizada.`
                          )
                        }
                      />
                    </label>

                    <label className="admin-switch-row">
                      <span>
                        <strong>Selección de maduración</strong>
                        <small>
                          Permite elegir Verde / más firme, punto medio o maduro.
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={product.maturity_selection_enabled}
                        disabled={disabled}
                        onChange={(event) =>
                          patchProduct(
                            product,
                            {
                              maturitySelectionEnabled: event.target.checked,
                            },
                            `${product.name}: maduración actualizada.`
                          )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="products-admin-edit"
                      disabled={disabled}
                      onClick={() => openEdit(product)}
                    >
                      Editar información
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {(showCreate || editingProduct) && (
        <div
          className="products-admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingForm) {
              closeForm();
            }
          }}
        >
          <section className="products-admin-modal">
            <div className="products-admin-modal-header">
              <div>
                <span className="products-admin-modal-kicker">
                  {showCreate ? "Nuevo producto" : `Producto #${editingProduct?.id}`}
                </span>
                <h2>{showCreate ? "Agregar al catálogo" : "Editar producto"}</h2>
              </div>

              <button
                type="button"
                aria-label="Cerrar"
                onClick={closeForm}
                disabled={savingForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="products-admin-form">
              <label>
                Nombre
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="products-admin-form-grid">
                <label>
                  Categoría
                  <input
                    type="text"
                    required
                    list="admin-product-categories"
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  />
                  <datalist id="admin-product-categories">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </label>

                <label>
                  Unidad de venta
                  <input
                    type="text"
                    required
                    placeholder="Kg, Und, Bandeja..."
                    value={form.unit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        unit: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              {showCreate ? (
                <label>
                  Precio inicial
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                  />
                  <small>
                    Si luego aparece en CENADA, asígnalo desde Precios para que
                    entre al flujo automático.
                  </small>
                </label>
              ) : (
                <div className="products-admin-price-note">
                  <span>Precio actual</span>
                  <strong>{formatPrice(editingProduct?.price ?? null)}</strong>
                  <small>
                    Los precios existentes se administran desde Admin → Precios
                    para conservar las reglas y el historial.
                  </small>
                </div>
              )}

              <label>
                Imagen
                <input
                  type="text"
                  placeholder="/productos/mamon-chino.webp o URL"
                  value={form.imageUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Descripción
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="products-admin-modal-toggles">
                <label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    <strong>Disponible en tienda</strong>
                    <small>
                      Para productos nuevos recomiendo dejarlo apagado hasta
                      revisar imagen, precio y datos.
                    </small>
                  </span>
                </label>

                <label className="seasonal-option">
                  <input
                    type="checkbox"
                    checked={form.isSeasonal}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isSeasonal: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    <strong>Producto de temporada</strong>
                    <small>
                      Aparecerá en el filtro especial además de su categoría.
                    </small>
                  </span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={form.maturitySelectionEnabled}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maturitySelectionEnabled: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    <strong>Permitir seleccionar maduración</strong>
                    <small>
                      Úsalo solo en productos donde el punto de maduración
                      importe para el cliente.
                    </small>
                  </span>
                </label>
              </div>

              <div className="products-admin-modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={closeForm}
                  disabled={savingForm}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={savingForm}>
                  {savingForm
                    ? "Guardando..."
                    : showCreate
                      ? "Crear producto"
                      : "Guardar cambios"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
