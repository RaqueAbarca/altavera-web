"use client";

import Link from "next/link";
import { FaShoppingBasket } from "react-icons/fa";

export default function EmptyCart() {
  return (
    <section className="empty-cart">

      <FaShoppingBasket className="empty-icon" />

      <h2>Tu carrito está vacío</h2>

      <p>
        Agrega algunos productos frescos para comenzar tu pedido.
      </p>

      <Link
        href="/productos"
        className="btn btn-primary"
      >
        Ver productos
      </Link>

    </section>
  );
}