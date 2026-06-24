"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { name: "Inicio", href: "/" },
    { name: "Productos", href: "/productos" },
    { name: "Canastas", href: "/canastas" },
    { name: "Nosotros", href: "/nosotros" },
    { name: "Contacto", href: "/contacto" },
  ];

  return (
    <header className="header">
      <div className="container header-inner">
        
        {/* LOGO */}
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

        {/* Desktop nav */}
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

        <button className="btn btn-primary">Mi carrito</button>

        {/* Mobile button */}
        <button className="menu-btn" onClick={() => setOpen(!open)}>
          ☰
        </button>
      </div>

      {/* Mobile menu */}
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