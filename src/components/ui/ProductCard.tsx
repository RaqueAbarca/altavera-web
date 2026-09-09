"use client";

import "../productos/productos.css";
import { useEffect, useState } from "react";
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
  isFavorite?: boolean;
  favoritePending?: boolean;
  onToggleFavorite?: () => void;
  onAdd: (
    quantity: number,
    maturityPreference: MaturityPreference | null
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
  isFavorite = false,
  favoritePending = false,
  onToggleFavorite,
  onAdd,
  onIncrease,
  onDecrease,
  onRemove,
}: ProductCardProps) {
  const [selecting, setSelecting] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(
    isKilogramUnit(unit) ? 0.5 : 1
  );
  const [tempMaturity, setTempMaturity] =
    useState<MaturityPreference | null>(maturityPreference);

  const equivalence = formatProductEquivalence(
    unit,
    averageUnitWeightGrams,
    unitsPerKgMin,
    unitsPerKgMax
  );

  useEffect(() => {
    if (!selecting) {
      setTempMaturity(maturityPreference ?? null);
    }
  }, [maturityPreference, selecting]);

  function getStep() {
    return isKilogramUnit(unit) ? 0.5 : 1;
  }

  function increaseTemp() {
    setTempQuantity((prev) => prev + getStep());
  }

  function decreaseTemp() {
    const newQuantity = tempQuantity - getStep();

    if (newQuantity <= 0) {
      if (quantity > 0) {
        onRemove();
      }

      setSelecting(false);
      setTempQuantity(getStep());
      return;
    }

    setTempQuantity(newQuantity);
  }

  function confirmAdd() {
    onAdd(tempQuantity, tempMaturity);
    setSelecting(false);
  }

  return (
    <div
      className={
        isSeasonal
          ? "product-card seasonal-product-card"
          : "product-card"
      }
    >
      <div className="product-image-wrap">
        <img
          src={image}
          alt={name}
          className="product-image"
        />

        {onToggleFavorite && (
          <button
            type="button"
            className={`product-favorite-btn ${isFavorite ? "product-favorite-btn--active" : ""}`}
            onClick={onToggleFavorite}
            disabled={favoritePending}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite
                ? `Quitar ${name} de favoritos`
                : `Guardar ${name} en favoritos`
            }
            title={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
          >
            <Heart
              size={20}
              strokeWidth={2.2}
              fill={isFavorite ? "currentColor" : "none"}
            />
          </button>
        )}

        {isSeasonal && (
          <span className="seasonal-badge">
            De temporada
          </span>
        )}
      </div>

      <div className="product-content">
        <h3>{name}</h3>

        <p className="price">
          ₡{price.toLocaleString("es-CR")}
          <span> / {unit}</span>
        </p>

        {equivalence && (
          <p className="product-equivalence">{equivalence}</p>
        )}

        {maturitySelectionEnabled && !selecting && (
          <p className="maturity-card-note">
            Puedes elegir la maduración antes de agregarlo
          </p>
        )}

        {quantity === 0 && !selecting && (
          <button
            className="add-btn"
            onClick={() => setSelecting(true)}
          >
            Agregar
          </button>
        )}

        {selecting && (
          <>
            <div className="quantity-controls">
              <button
                className="qty-btn"
                onClick={decreaseTemp}
              >
                −
              </button>

              <span className="qty">
                {tempQuantity} {unit}
              </span>

              <button
                className="qty-btn"
                onClick={increaseTemp}
              >
                +
              </button>
            </div>

            {maturitySelectionEnabled && (
              <label className="product-maturity-picker">
                <span>Maduración</span>
                <select
                  value={tempMaturity ?? ""}
                  onChange={(event) =>
                    setTempMaturity(
                      event.target.value
                        ? (event.target.value as MaturityPreference)
                        : null
                    )
                  }
                >
                  <option value="">Sin preferencia</option>
                  {MATURITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small>
                  Haremos lo posible por respetarla según disponibilidad.
                </small>
              </label>
            )}

            <button
              className="add-btn"
              onClick={confirmAdd}
            >
              Confirmar
            </button>
          </>
        )}

        {quantity > 0 && !selecting && (
          <>
            <p className="added-message">
              ✓ En carrito: {quantity} {unit}
            </p>

            {maturitySelectionEnabled && maturityPreference && (
              <p className="selected-maturity-note">
                Maduración: {getMaturityLabel(maturityPreference)}
              </p>
            )}

            <button
              className="modify-btn"
              onClick={() => {
                setTempQuantity(quantity);
                setTempMaturity(maturityPreference ?? null);
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
