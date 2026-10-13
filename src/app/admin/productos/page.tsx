"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./productos-admin.css";
import { formatProductEquivalence, isKilogramUnit } from "@/lib/productUnits";
import {
  calculateVariantPrice,
  formatVariantCalculationSummary,
  formatVariantDescriptor,
  type ProductSizeVariant,
  type VariantCalculationMode,
} from "@/lib/productVariants";

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
  average_unit_weight_g: number | null;
  approx_units_per_kg_min: number | null;
  approx_units_per_kg_max: number | null;
  variant_selection_enabled: boolean;
  size_variants: ProductSizeVariant[];
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
  averageUnitWeightGrams: string;
  unitsPerKgMin: string;
  unitsPerKgMax: string;
  variantSelectionEnabled: boolean;
  sizeVariants: ProductSizeVariant[];
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
  averageUnitWeightGrams: "",
  unitsPerKgMin: "",
  unitsPerKgMax: "",
  variantSelectionEnabled: false,
  sizeVariants: [],
};

function productToForm(product: Product): ProductForm {
  return {
    name: product.name,
    description: product.description ?? "",
    category: product.category ?? "",
    unit: product.unit ?? "",
    imageUrl: product.image_url ?? "",
    price: product.price?.toString() ?? "",
    isActive: product.is_active,
    isSeasonal: product.is_seasonal,
    maturitySelectionEnabled: product.maturity_selection_enabled,
    averageUnitWeightGrams: product.average_unit_weight_g?.toString() ?? "",
    unitsPerKgMin: product.approx_units_per_kg_min?.toString() ?? "",
    unitsPerKgMax: product.approx_units_per_kg_max?.toString() ?? "",
    variantSelectionEnabled: product.variant_selection_enabled ?? false,
    sizeVariants: product.size_variants ?? [],
  };
}

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
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [removeImageRequested, setRemoveImageRequested] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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

  function resetImageSelection() {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImageFile(null);
    setSelectedImagePreview("");
    setRemoveImageRequested(false);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function openEdit(product: Product) {
    resetImageSelection();
    setEditingProduct(product);
    setShowCreate(false);
    setForm(productToForm(product));
    setMessage("");
    setError("");
  }

  function openCreate() {
    resetImageSelection();
    setEditingProduct(null);
    setShowCreate(true);
    setForm(EMPTY_FORM);
    setMessage("");
    setError("");
  }

  function closeForm() {
    resetImageSelection();
    setEditingProduct(null);
    setShowCreate(false);
    setForm(EMPTY_FORM);
  }

  function handleImageChange(file: File | null) {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("La imagen debe ser JPG, PNG o WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen debe pesar como máximo 5 MB.");
      return;
    }

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setSelectedImageFile(file);
    setSelectedImagePreview(URL.createObjectURL(file));
    setRemoveImageRequested(false);
    setError("");
  }

  function requestImageRemoval() {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImageFile(null);
    setSelectedImagePreview("");
    setRemoveImageRequested(true);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
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
            averageUnitWeightGrams: form.averageUnitWeightGrams
              ? Number(form.averageUnitWeightGrams)
              : null,
            unitsPerKgMin: form.unitsPerKgMin
              ? Number(form.unitsPerKgMin)
              : null,
            unitsPerKgMax: form.unitsPerKgMax
              ? Number(form.unitsPerKgMax)
              : null,
            variantSelectionEnabled: form.variantSelectionEnabled,
            sizeVariants: form.sizeVariants,
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
            averageUnitWeightGrams: form.averageUnitWeightGrams
              ? Number(form.averageUnitWeightGrams)
              : null,
            unitsPerKgMin: form.unitsPerKgMin
              ? Number(form.unitsPerKgMin)
              : null,
            unitsPerKgMax: form.unitsPerKgMax
              ? Number(form.unitsPerKgMax)
              : null,
            variantSelectionEnabled: form.variantSelectionEnabled,
            sizeVariants: form.sizeVariants,
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

      let savedProduct = data.product as Product;

      try {
        if (selectedImageFile) {
          const imageFormData = new FormData();
          imageFormData.append("file", selectedImageFile);

          const imageResponse = await fetch(
            `/api/admin/products/${savedProduct.id}/image`,
            { method: "POST", body: imageFormData }
          );
          const imageData = await imageResponse.json();

          if (!imageResponse.ok) {
            throw new Error(imageData.error ?? "No se pudo subir la imagen");
          }

          savedProduct = { ...savedProduct, image_url: imageData.imageUrl };
        } else if (!isCreating && removeImageRequested) {
          const imageResponse = await fetch(
            `/api/admin/products/${savedProduct.id}/image`,
            { method: "DELETE" }
          );
          const imageData = await imageResponse.json();

          if (!imageResponse.ok) {
            throw new Error(imageData.error ?? "No se pudo quitar la imagen");
          }

          savedProduct = { ...savedProduct, image_url: imageData.imageUrl };
        }
      } catch (imageError) {
        if (isCreating) {
          setProducts((current) =>
            [...current.filter((product) => product.id !== savedProduct.id), savedProduct].sort(
              (a, b) => a.name.localeCompare(b.name, "es")
            )
          );
          setShowCreate(false);
        } else {
          replaceProduct(savedProduct);
        }

        setEditingProduct(savedProduct);
        setForm(productToForm(savedProduct));
        throw new Error(
          `Los datos se guardaron, pero la imagen no: ${
            imageError instanceof Error ? imageError.message : "error desconocido"
          }`
        );
      }

      if (isCreating) {
        setProducts((current) =>
          [...current.filter((product) => product.id !== savedProduct.id), savedProduct].sort(
            (a, b) => a.name.localeCompare(b.name, "es")
          )
        );
        setMessage(`${savedProduct.name} fue creado correctamente.`);
      } else {
        replaceProduct(savedProduct);
        setMessage(`${savedProduct.name} fue actualizado.`);
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
                          <span className="status-badge maturity">Con maduración</span>
                        )}
                        {product.variant_selection_enabled && (
                          <span className="status-badge variants">Presentaciones</span>
                        )}
                      </div>

                      <h2>{product.name}</h2>
                      <p>
                        {product.category || "Sin categoría"}
                        {" · "}
                        {product.unit || "Sin unidad"}
                      </p>
                      <strong>{formatPrice(product.price)}</strong>
                      {formatProductEquivalence(
                        product.unit ?? "",
                        product.average_unit_weight_g,
                        product.approx_units_per_kg_min,
                        product.approx_units_per_kg_max
                      ) && (
                        <small className="products-admin-equivalence">
                          {formatProductEquivalence(
                            product.unit ?? "",
                            product.average_unit_weight_g,
                            product.approx_units_per_kg_min,
                            product.approx_units_per_kg_max
                          )}
                        </small>
                      )}
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

              <div className="products-admin-form-grid">
                <label>
                  Mín. unidades por kg
                  <input
                    type="number"
                    min="0.1"
                    max="1000"
                    step="0.1"
                    placeholder="Ej: 5"
                    value={form.unitsPerKgMin}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        unitsPerKgMin: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Máx. unidades por kg
                  <input
                    type="number"
                    min="0.1"
                    max="1000"
                    step="0.1"
                    placeholder="Ej: 8"
                    value={form.unitsPerKgMax}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        unitsPerKgMax: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                Peso aprox. por unidad o presentación (gramos)
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  placeholder="Ej: 450"
                  value={form.averageUnitWeightGrams}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      averageUnitWeightGrams: event.target.value,
                    }))
                  }
                />
                <small>
                  La tienda prioriza el rango de unidades por kg cuando está
                  disponible. Si no hay rango, usa este peso para calcular una
                  equivalencia aproximada. También sirve para presentaciones
                  como un rollo de espárragos.
                </small>
                {(form.averageUnitWeightGrams ||
                  form.unitsPerKgMin ||
                  form.unitsPerKgMax) &&
                  formatProductEquivalence(
                    form.unit,
                    form.averageUnitWeightGrams
                      ? Number(form.averageUnitWeightGrams)
                      : null,
                    form.unitsPerKgMin ? Number(form.unitsPerKgMin) : null,
                    form.unitsPerKgMax ? Number(form.unitsPerKgMax) : null
                  ) && (
                    <span className="products-admin-equivalence-preview">
                      Vista previa: {formatProductEquivalence(
                        form.unit,
                        form.averageUnitWeightGrams
                          ? Number(form.averageUnitWeightGrams)
                          : null,
                        form.unitsPerKgMin
                          ? Number(form.unitsPerKgMin)
                          : null,
                        form.unitsPerKgMax
                          ? Number(form.unitsPerKgMax)
                          : null
                      )}
                    </span>
                  )}
              </label>

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

              <section className="products-admin-image-editor">
                <div className="products-admin-image-preview">
                  <img
                    src={
                      selectedImagePreview ||
                      (removeImageRequested ? "/logo.svg" : form.imageUrl || "/logo.svg")
                    }
                    alt="Vista previa del producto"
                  />
                </div>

                <div className="products-admin-image-actions">
                  <div>
                    <strong>Imagen del producto</strong>
                    <small>JPG, PNG o WebP · máximo 5 MB</small>
                  </div>

                  <input
                    ref={imageInputRef}
                    className="products-admin-image-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      handleImageChange(event.target.files?.[0] ?? null)
                    }
                  />

                  <div className="products-admin-image-buttons">
                    <button
                      type="button"
                      className="products-admin-image-change"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {form.imageUrl && form.imageUrl !== "/logo.svg"
                        ? "Cambiar imagen"
                        : "Seleccionar imagen"}
                    </button>

                    {!showCreate &&
                      form.imageUrl &&
                      form.imageUrl !== "/logo.svg" &&
                      !removeImageRequested && (
                        <button
                          type="button"
                          className="products-admin-image-remove"
                          onClick={requestImageRemoval}
                        >
                          Quitar imagen
                        </button>
                      )}
                  </div>

                  {selectedImageFile && (
                    <small className="products-admin-image-status">
                      Nueva imagen: {selectedImageFile.name}
                    </small>
                  )}
                  {removeImageRequested && (
                    <small className="products-admin-image-status">
                      La imagen actual se quitará al guardar.
                    </small>
                  )}
                </div>
              </section>

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

              <section className="products-admin-variants-editor">
                <label className="products-admin-variant-enable">
                  <input
                    type="checkbox"
                    checked={form.variantSelectionEnabled}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        variantSelectionEnabled: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    <strong>Vender por presentación</strong>
                    <small>
                      Para tamaños, ramas, matas u otras presentaciones. Cada una puede calcularse por peso, fracción o factor del precio base.
                    </small>
                  </span>
                </label>

                {form.variantSelectionEnabled && (
                  <div className="products-admin-variant-list">
                    {form.sizeVariants.map((variant, index) => {
                      const basePrice = showCreate
                        ? Number(form.price)
                        : Number(editingProduct?.price ?? 0);
                      const derivedPrice = calculateVariantPrice(basePrice, variant);
                      const descriptor = formatVariantDescriptor(variant);

                      function updateVariant(
                        updates: Partial<ProductSizeVariant>
                      ) {
                        setForm((current) => ({
                          ...current,
                          sizeVariants: current.sizeVariants.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, ...updates } : item
                          ),
                        }));
                      }

                      return (
                        <div className="products-admin-variant-row" key={variant.id}>
                          <label className="products-admin-variant-field">
                            <span>Presentación</span>
                            <input
                              type="text"
                              placeholder="Ej. Rama, Mediana, Mata grande"
                              value={variant.label}
                              onChange={(event) => updateVariant({ label: event.target.value })}
                            />
                          </label>

                          <label className="products-admin-variant-field">
                            <span>Cómo calcular el precio</span>
                            <select
                              value={variant.calculationMode}
                              onChange={(event) => {
                                const calculationMode = event.target.value as VariantCalculationMode;
                                updateVariant({
                                  calculationMode,
                                  calculationValue:
                                    calculationMode === variant.calculationMode
                                      ? variant.calculationValue
                                      : null,
                                  minWeightKg: calculationMode === "weight" ? variant.minWeightKg : null,
                                  maxWeightKg: calculationMode === "weight" ? variant.maxWeightKg : null,
                                  referenceWeightKg: calculationMode === "weight" ? variant.referenceWeightKg : null,
                                  weightLabel: calculationMode === "weight" ? variant.weightLabel : "",
                                });
                              }}
                            >
                              <option value="weight">Por peso (kg × precio base)</option>
                              <option value="fraction">Por fracción (precio base ÷ cantidad)</option>
                              <option value="factor">Por factor (precio base × factor)</option>
                            </select>
                          </label>

                          <label className="products-admin-variant-field">
                            <span>Unidad que verá el cliente</span>
                            <input
                              type="text"
                              placeholder="und, rama, mata..."
                              value={variant.unitLabel}
                              onChange={(event) => updateVariant({ unitLabel: event.target.value })}
                            />
                          </label>

                          {variant.calculationMode === "weight" && (
                            <div className="products-admin-variant-dynamic-fields products-admin-variant-dynamic-fields--weight">
                              <label className="products-admin-variant-field">
                                <span>Peso mínimo (kg)</span>
                                <input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  placeholder="3"
                                  value={variant.minWeightKg ?? ""}
                                  onChange={(event) =>
                                    updateVariant({
                                      minWeightKg: event.target.value ? Number(event.target.value) : null,
                                    })
                                  }
                                />
                              </label>
                              <label className="products-admin-variant-field">
                                <span>Peso máximo (kg)</span>
                                <input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  placeholder="5"
                                  value={variant.maxWeightKg ?? ""}
                                  onChange={(event) =>
                                    updateVariant({
                                      maxWeightKg: event.target.value ? Number(event.target.value) : null,
                                    })
                                  }
                                />
                              </label>
                              <label className="products-admin-variant-field">
                                <span>Peso para calcular precio (kg)</span>
                                <input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  placeholder="4"
                                  value={variant.referenceWeightKg ?? ""}
                                  onChange={(event) =>
                                    updateVariant({
                                      referenceWeightKg: event.target.value ? Number(event.target.value) : null,
                                    })
                                  }
                                />
                              </label>
                            </div>
                          )}

                          {variant.calculationMode === "fraction" && (
                            <div className="products-admin-variant-dynamic-fields">
                              <label className="products-admin-variant-field">
                                <span>Dividir el precio base entre</span>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  placeholder="13"
                                  value={variant.calculationValue ?? ""}
                                  onChange={(event) =>
                                    updateVariant({
                                      calculationValue: event.target.value ? Number(event.target.value) : null,
                                    })
                                  }
                                />
                              </label>
                              <div className="products-admin-variant-example">
                                Ejemplo: si una mata trae 13 ramas, poné 13.
                              </div>
                            </div>
                          )}

                          {variant.calculationMode === "factor" && (
                            <div className="products-admin-variant-dynamic-fields">
                              <label className="products-admin-variant-field">
                                <span>Multiplicar el precio base por</span>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  placeholder="1.2"
                                  value={variant.calculationValue ?? ""}
                                  onChange={(event) =>
                                    updateVariant({
                                      calculationValue: event.target.value ? Number(event.target.value) : null,
                                    })
                                  }
                                />
                              </label>
                              <div className="products-admin-variant-example">
                                Ejemplo: 0,8 para una presentación menor o 1,2 para una mayor.
                              </div>
                            </div>
                          )}

                          <div className="products-admin-variant-footer">
                            <div className="products-admin-variant-derived-price">
                              <span>Precio calculado</span>
                              <strong>{derivedPrice !== null ? formatPrice(derivedPrice) : "—"}</strong>
                              <small>
                                {formatVariantCalculationSummary(variant)}
                                {descriptor ? ` · ${descriptor}` : ""}
                              </small>
                            </div>
                            <div className="products-admin-variant-actions">
                              <label className="products-admin-variant-active">
                                <input
                                  type="checkbox"
                                  checked={variant.active}
                                  onChange={(event) => updateVariant({ active: event.target.checked })}
                                />
                                Activo
                              </label>
                              <button
                                type="button"
                                className="products-admin-variant-remove"
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    sizeVariants: current.sizeVariants.filter((_, itemIndex) => itemIndex !== index),
                                  }))
                                }
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <small className="products-admin-variant-help">
                      El precio base sigue administrándose desde Admin → Precios. Las presentaciones se recalculan automáticamente cuando ese precio cambia.
                    </small>
                    <button
                      type="button"
                      className="products-admin-variant-add"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          sizeVariants: [
                            ...current.sizeVariants,
                            {
                              id: `presentation-${Date.now()}-${current.sizeVariants.length}`,
                              label: "",
                              calculationMode: isKilogramUnit(form.unit) ? "weight" : "factor",
                              calculationValue: null,
                              minWeightKg: null,
                              maxWeightKg: null,
                              referenceWeightKg: null,
                              weightLabel: "",
                              unitLabel: "und",
                              price: null,
                              active: true,
                            },
                          ],
                        }))
                      }
                    >
                      + Agregar presentación
                    </button>
                  </div>
                )}
              </section>

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
