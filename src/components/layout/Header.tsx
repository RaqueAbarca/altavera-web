"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  MessageCircle,
} from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Temporal.
  // Luego este valor vendrá del carrito real: const { cartCount } = useCart();
  const cartCount = 3;

  const links = [
    { name: "Inicio", href: "/" },
    { name: "Productos", href: "/productos" },
    { name: "Nosotros", href: "/nosotros" },
    { name: "Contacto", href: "/contacto" },
  ];

  return (
    <header className="header">
      <div className="container header-inner">

        {/* Logo */}
        <Link href="/" className="logo">
          <Image
            src="/logo.png"
            alt="Altavera"
            width={140}
            height={40}
            className="logo-img"
            priority
          />
        </Link>

        {/* Navegación escritorio */}
        <nav className="nav">
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${active ? "active" : ""}`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Acciones */}
        <div className="header-actions">

          {/* WhatsApp */}
          <a
            href="https://wa.me/50600000000"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary whatsapp-btn"
          >
            <MessageCircle size={18} />
            <span>WhatsApp</span>
          </a>

          {/* Carrito */}
          <button
            className="cart-button"
            aria-label="Mi carrito"
          >
            <ShoppingCart size={24} />

            {cartCount > 0 && (
              <span className="cart-badge">
                {cartCount}
              </span>
            )}
          </button>

          {/* Menú móvil */}
          <button
            className="menu-btn"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>

        </div>

      </div>

      {/* Menú móvil */}

      {open && (
        <nav className="mobile-nav">

          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-link ${active ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {link.name}
              </Link>
            );
          })}

        </nav>
      )}

    </header>
  );
}