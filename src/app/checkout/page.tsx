"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "./checkout.css";
import GuestForm from "./GuestForm";

export default function CheckoutPage() {
  return (
    <main className="checkout-page container">
      <Link href="/carrito" className="checkout-back-link">
        <ArrowLeft size={17} />
        Volver al carrito
      </Link>
      <GuestForm />
    </main>
  );
}
