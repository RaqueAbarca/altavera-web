"use client";

import "../productos/productos.css";
import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import {
  MATURITY_OPTIONS,
  getMaturityLabel,
  type MaturityPreference,
} from "@/lib/maturity";
import {
  formatProductEquivalence,
  isKilogramUnit,
} from "@/lib/productUnits";
import {
  calculateVariantPrice,
  formatVariantDescriptor,
  getVariantPriceUnitLabel,
  getVariantQuantityUnit,
  getVariantSelectorLabel,
  type ProductSizeVariant,
} from "@/lib/productVariants";

type ProductCardProps = {
  image: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  maturitySelectionEnabled?: boolean;
  maturityPreference?: MaturityPreference | null;
  averageUnitWeightGrams?: number | null;
  unitsPerKgMin?: number | null;
  unitsPerKgMax?: number | null;
  isSeasonal?: boolean;
  variantSelectionEnabled?: boolean;
  sizeVariants?: ProductSizeVariant[];
  selectedVariantId?: string | null;
  isFavorite?: boolean;
  favoritePending?: boolean;
  onToggleFavorite?: () => void;
  onAdd: (
    quantity: number,
    maturityPreference: MaturityPreference | null,
    variantId: string | null
  ) => void;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
};

export default function ProductCard({
  image,
  name,
  price,
  unit,
  quantity,
  maturitySelectionEnabled = false,
  maturityPreference = null,
  averageUnitWeightGrams = null,
  unitsPerKgMin = null,
  unitsPerKgMax = null,
  isSeasonal = false,
  variantSelectionEnabled = false,
  sizeVariants = [],
  selectedVariantId = null,
  isFavorite = false,
  favoritePending = false,
  onToggleFavorite,
  onAdd,
  onIncrease,
  onDecrease,
  onRemove,
}: ProductCardProps) {
  const activeVariants = useMemo(
    () => sizeVariants.filter((variant) => variant.active !== false),
    [sizeVariants]
  );
  const hasVariants = variantSelectionEnabled && activeVariants.length > 0;
  const hasSingleVariant = hasVariants && activeVariants.length === 1;
  const hasMultipleVariants = hasVariants && activeVariants.length > 1;
  const initialVariantId =
    selectedVariantId && activeVariants.some((variant) => variant.id === selectedVariantId)
      ? selectedVariantId
      : activeVariants[0]?.id ?? null;

  const [selecting, setSelecting] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(
    hasVariants ? 1 : isKilogramUnit(unit) ? 0.5 : 1
  );
  const [tempMaturity, setTempMaturity] =
    useState<MaturityPreference | null>(maturityPreference);
  const [tempVariantId, setTempVariantId] = useState<string | null>(initialVariantId);

  const selectedVariant =
    activeVariants.find((variant) => variant.id === selectedVariantId) ?? null;
  const tempVariant =
    activeVariants.find((variant) => variant.id === tempVariantId) ?? null;
  const variantPrices = activeVariants
    .map((variant) => calculateVariantPrice(price, variant))
    .filter((value): value is number => value !== null);
  const minimumVariantPrice = variantPrices.length
    ? Math.min(...variantPrices)
    : null;
  const singleVariant = hasSingleVariant ? activeVariants[0] : null;
  const singleVariantPrice = singleVariant
    ? calculateVariantPrice(price, singleVariant)
    : null;
  const singleVariantDescriptor = singleVariant
    ? formatVariantDescriptor(singleVariant)
    : "";
  const singleVariantPriceUnit = getVariantPriceUnitLabel(singleVariant);
  const selectorLabel = getVariantSelectorLabel(activeVariants);
  const activePriceUnits = activeVariants.map((variant) => getVariantPriceUnitLabel(variant));
  const commonVariantPriceUnit =
    activePriceUnits.length > 0 && activePriceUnits.every((value) => value === activePriceUnits[0])
      ? activePriceUnits[0]
      : null;

  const equivalence = hasVariants
    ? null
    : formatProductEquivalence(
        unit,
        averageUnitWeightGrams,
        unitsPerKgMin,
        unitsPerKgMax
      );

  useEffect(() => {
    if (!selecting) {
      setTempMaturity(maturityPreference ?? null);
      setTempVariantId(initialVariantId);
    }
  }, [maturityPreference, selecting, initialVariantId]);

  function getStep() {
    return hasVariants ? 1 : isKilogramUnit(unit) ? 0.5 : 1;
  }

  function increaseTemp() {
    setTempQuantity((prev) => prev + getStep());
  }

  function decreaseTemp() {
    const newQuantity = tempQuantity - getStep();

    if (newQuantity <= 0) {
      if (quantity > 0) onRemove();
      setSelecting(false);
      setTempQuantity(getStep());
      return;
    }

    setTempQuantity(newQuantity);
  }

  function confirmAdd() {
    if (hasVariants && !tempVariantId) return;
    onAdd(tempQuantity, tempMaturity, hasVariants ? tempVariantId : null);
    setSelecting(false);
  }

  return (
    <div className={isSeasonal ? "product-card seasonal-product-card" : "product-card"}>
      <div className="product-image-wrap">
        <img src={image} alt={name} className="product-image" />

        {onToggleFavorite && (
          <button
            type="button"
            className={`product-favorite-btn ${isFavorite ? "product-favorite-btn--active" : ""}`}
            onClick={onToggleFavorite}
            disabled={favoritePending}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Quitar ${name} de favoritos` : `Guardar ${name} en favoritos`}
            title={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          >
            <Heart size={20} strokeWidth={2.2} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        )}

        {isSeasonal && <span className="seasonal-badge">De temporada</span>}
      </div>

      <div className="product-content">
        <h3>{name}</h3>

        <p className="price">
          {hasSingleVariant && singleVariantPrice !== null ? (
            <>₡{singleVariantPrice.toLocaleString("es-CR")}<span> / {singleVariantPriceUnit}</span></>
          ) : hasMultipleVariants && minimumVariantPrice !== null ? (
            <>
              Desde ₡{minimumVariantPrice.toLocaleString("es-CR")}
              {commonVariantPriceUnit ? <span> / {commonVariantPriceUnit}</span> : null}
            </>
          ) : (
            <>₡{price.toLocaleString("es-CR")}<span> / {unit}</span></>
          )}
        </p>

        {hasMultipleVariants && !selecting && quantity === 0 && (
          <p className="product-equivalence">
            Elegí {selectorLabel === "Tamaño" ? "el tamaño" : "la presentación"} antes de agregar.
          </p>
        )}

        {hasSingleVariant && singleVariantDescriptor && !selecting && (
          <p className="product-equivalence">{singleVariantDescriptor}</p>
        )}

        {equivalence && <p className="product-equivalence">{equivalence}</p>}

        {maturitySelectionEnabled && !selecting && (
          <p className="maturity-card-note">Puedes elegir la maduración antes de agregarlo</p>
        )}

        {quantity === 0 && !selecting && (
          <button className="add-btn" onClick={() => setSelecting(true)}>Agregar</button>
        )}

        {selecting && (
          <>
            {hasMultipleVariants && (
              <label className="product-variant-picker">
                <span>{selectorLabel}</span>
                <select
                  value={tempVariantId ?? ""}
                  onChange={(event) => setTempVariantId(event.target.value || null)}
                >
                  {activeVariants.map((variant) => {
                    const variantPrice = calculateVariantPrice(price, variant);
                    const descriptor = formatVariantDescriptor(variant);

                    return (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}{descriptor ? ` · ${descriptor}` : ""}{variantPrice !== null ? ` · ₡${variantPrice.toLocaleString("es-CR")}` : ""}
                      </option>
                    );
                  })}
                </select>
                {tempVariant && (
                  <small>
                    {formatVariantDescriptor(tempVariant) || `Venta por ${getVariantPriceUnitLabel(tempVariant)}`}
                    {calculateVariantPrice(price, tempVariant) !== null
                      ? ` · ₡${calculateVariantPrice(price, tempVariant)!.toLocaleString("es-CR")} por ${getVariantPriceUnitLabel(tempVariant)}`
                      : ""}
                  </small>
                )}
              </label>
            )}


            {hasSingleVariant && tempVariant && (
              <p className="product-equivalence">
                {formatVariantDescriptor(tempVariant) || `Venta por ${getVariantPriceUnitLabel(tempVariant)}`}
                {calculateVariantPrice(price, tempVariant) !== null
                  ? ` · ₡${calculateVariantPrice(price, tempVariant)!.toLocaleString("es-CR")} por ${getVariantPriceUnitLabel(tempVariant)}`
                  : ""}
              </p>
            )}

            <div className="quantity-controls">
              <button className="qty-btn" onClick={decreaseTemp}>−</button>
              <span className="qty">{tempQuantity} {hasVariants ? getVariantQuantityUnit(tempVariant) : unit}</span>
              <button className="qty-btn" onClick={increaseTemp}>+</button>
            </div>

            {maturitySelectionEnabled && (
              <label className="product-maturity-picker">
                <span>Maduración</span>
                <select
                  value={tempMaturity ?? ""}
                  onChange={(event) =>
                    setTempMaturity(
                      event.target.value ? (event.target.value as MaturityPreference) : null
                    )
                  }
                >
                  <option value="">Sin preferencia</option>
                  {MATURITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <small>Haremos lo posible por respetarla según disponibilidad.</small>
              </label>
            )}

            <button className="add-btn" onClick={confirmAdd}>Confirmar</button>
          </>
        )}

        {quantity > 0 && !selecting && (
          <>
            <p className="added-message">✓ En carrito: {quantity} {hasVariants ? getVariantQuantityUnit(selectedVariant) : unit}</p>

            {hasVariants && selectedVariant && (
              <p className="selected-variant-note">
                {hasSingleVariant
                  ? (formatVariantDescriptor(selectedVariant) || `Venta por ${getVariantPriceUnitLabel(selectedVariant)}`)
                  : `${selectedVariant.label}${formatVariantDescriptor(selectedVariant) ? ` · ${formatVariantDescriptor(selectedVariant)}` : ""}`}
              </p>
            )}

            {maturitySelectionEnabled && maturityPreference && (
              <p className="selected-maturity-note">Maduración: {getMaturityLabel(maturityPreference)}</p>
            )}

            <button
              className="modify-btn"
              onClick={() => {
                setTempQuantity(quantity);
                setTempMaturity(maturityPreference ?? null);
                setTempVariantId(initialVariantId);
                setSelecting(true);
              }}
            >
              Modificar pedido
            </button>
          </>
        )}
      </div>
    </div>
  );
}
