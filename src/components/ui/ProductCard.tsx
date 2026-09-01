"use client";

import "../productos/productos.css";
import { useState } from "react";

type ProductCardProps = {
  image: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  maturitySelectionEnabled?: boolean;
  isSeasonal?: boolean;
  onAdd: (quantity: number) => void;
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
  isSeasonal = false,
  onAdd,
  onIncrease,
  onDecrease,
  onRemove,
}: ProductCardProps) {
  const [selecting, setSelecting] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(
    unit.toLowerCase() === "kg" ? 0.5 : 1
  );

  function getStep() {
    return unit.toLowerCase() === "kg" ? 0.5 : 1;
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
    onAdd(tempQuantity);
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

        {maturitySelectionEnabled && (
          <p className="maturity-card-note">
            Puedes elegir maduración en el carrito
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

            <button
              className="modify-btn"
              onClick={() => {
                setTempQuantity(quantity);
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
