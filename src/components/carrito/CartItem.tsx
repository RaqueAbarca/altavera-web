"use client";

import { CartItem as Item } from "@/types/cart";
import { useCart } from "@/hooks/useCart";
import { FaTrash } from "react-icons/fa";

type Props = {
  item: Item;
};

export default function CartItem({ item }: Props) {
  const {
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
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
          ₡{item.price.toLocaleString("es-CR")} / {item.unit}
        </p>

        <div className="cart-controls">

          <button
            onClick={() => decreaseQuantity(item.id)}
            className="qty-btn"
          >
            −
          </button>

          <span>{item.quantity}</span>

          <button
            onClick={() => increaseQuantity(item.id)}
            className="qty-btn"
          >
            +
          </button>

          <button
            onClick={() => removeFromCart(item.id)}
            className="delete-btn"
            aria-label={`Eliminar ${item.name} del carrito`}
          >
            <FaTrash />
          </button>

        </div>

      </div>

      <div className="cart-price">
        ₡{(item.price * item.quantity).toLocaleString("es-CR")}
      </div>

    </article>
  );
}