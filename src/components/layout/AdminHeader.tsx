"use client";

import "./adminHeader.css";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Package,
  Truck,
  X,
} from "lucide-react";

const adminLinks = [
  { name: "Panel", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Pedidos", href: "/admin/pedidos", icon: ClipboardList },
  { name: "Entregas", href: "/admin/entregas", icon: Truck },
  { name: "Finanzas", href: "/admin/finanzas", icon: ChartNoAxesCombined },
  { name: "Precios", href: "/admin/precios", icon: BadgeDollarSign },
  { name: "Productos", href: "/admin/productos", icon: Package },
  { name: "Cobertura", href: "/admin/cobertura", icon: MapPinned },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoginPage = pathname === "/admin";

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="admin-site-header">
      <div className="admin-site-header__inner">
        <Link
          href={isLoginPage ? "/" : "/admin/dashboard"}
          className="admin-site-brand"
          aria-label={isLoginPage ? "Ir a Altavera" : "Ir al panel de administración"}
        >
          <Image
            src="/logowhite.svg"
            alt="Altavera"
            width={126}
            height={42}
            className="admin-site-brand__logo"
            priority
          />
          <span className="admin-site-brand__divider" aria-hidden="true" />
          <span className="admin-site-brand__label">Administración</span>
        </Link>

        {!isLoginPage && (
          <nav className="admin-site-nav" aria-label="Navegación administrativa">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-site-nav__link${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={16} strokeWidth={1.9} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="admin-site-actions">
          <Link href="/" className="admin-site-action admin-site-action--store">
            <ExternalLink size={17} />
            <span>Ver tienda</span>
          </Link>

          {!isLoginPage && (
            <button
              type="button"
              className="admin-site-action admin-site-action--logout"
              onClick={handleLogout}
            >
              <LogOut size={17} />
              <span>Salir</span>
            </button>
          )}

          {!isLoginPage && (
            <button
              type="button"
              className="admin-site-menu-button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? "Cerrar menú administrativo" : "Abrir menú administrativo"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </div>

      {!isLoginPage && menuOpen && (
        <nav className="admin-site-mobile-nav" aria-label="Navegación administrativa móvil">
          {adminLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-site-mobile-nav__link${active ? " is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="admin-site-mobile-nav__actions">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <ExternalLink size={18} />
              <span>Ver tienda</span>
            </Link>
            <button type="button" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
