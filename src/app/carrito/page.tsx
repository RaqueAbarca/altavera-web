"use client";

import { useCart } from "@/hooks/useCart";
import CartItem from "@/components/carrito/CartItem";
import CartSummary from "@/components/carrito/CartSummary";
import EmptyCart from "@/components/carrito/EmptyCart";
import "./carrito.css";

export default function CarritoPage() {
  const { cart } = useCart();

  return (
    <main className="cart-page container">

      <h1>Mi carrito</h1>

      {cart.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="cart-layout">

          <section className="cart-">

            {cart.map((item) => (
              <CartItem
                key={item.id}
                item={item}
              />
            ))}

          </section>

          <CartSummary />

        </div>
      )}

    </main>
  );
}