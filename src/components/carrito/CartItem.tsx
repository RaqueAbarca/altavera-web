"use client";

import { CartItem as Item } from "@/types/cart";
import { useCart } from "@/hooks/useCart";
import {
  MATURITY_OPTIONS,
  type MaturityPreference,
} from "@/lib/maturity";
import { FaTrash } from "react-icons/fa";
import "./maturity.css";

type Props = {
  item: Item;
};

export default function CartItem({ item }: Props) {
  const {
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    setMaturityPreference,
  } = useCart();

  return (
    <article className="cart-item">
      <img
        src={item.image}
        alt={item.name}
        className="cart-image"
      />

      <div className="cart-info">
        <h3>{item.name}</h3>

        <p className="cart-unit">
          ₡{item.price} / {item.unit}
        </p>

        <div className="cart-controls">
          <button
            onClick={() => decreaseQuantity(item.id)}
            className="qty-btn"
            type="button"
          >
            −
          </button>

          <span>{item.quantity}</span>

          <button
            onClick={() => increaseQuantity(item.id)}
            className="qty-btn"
            type="button"
          >
            +
          </button>

          <button
            onClick={() => removeFromCart(item.id)}
            className="delete-btn"
            type="button"
            aria-label={`Eliminar ${item.name}`}
          >
            <FaTrash />
          </button>
        </div>

        {item.maturity_selection_enabled && (
          <div className="maturity-selector">
            <label htmlFor={`maturity-${item.id}`}>
              Maduración deseada
            </label>

            <select
              id={`maturity-${item.id}`}
              value={item.maturity_preference ?? ""}
              onChange={(event) =>
                setMaturityPreference(
                  item.id,
                  event.target.value
                    ? (event.target.value as MaturityPreference)
                    : null
                )
              }
            >
              <option value="">Sin preferencia</option>
              {MATURITY_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <p>
              Haremos lo posible por respetar tu preferencia según disponibilidad.
            </p>
          </div>
        )}
      </div>

      <div className="cart-price">
        ₡{item.price * item.quantity}
      </div>
    </article>
  );
}
