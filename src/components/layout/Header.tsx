"use client";

import "./header.css";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/lib/supabase"; // 👈 Importamos supabase
import DeliveryNotice from "./DeliveryNotice";
import {
  Menu,
  X,
  ShoppingCart,
  User, // 👈 Importamos icono de usuario
  PackageSearch,
} from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null); // 👈 Estado para guardar el usuario logueado
  const [profile, setProfile] = useState<any>(null);

  const { cart } = useCart();
  const cartCount = cart.length;
  // Escuchar el estado de autenticación de Supabase
  useEffect(() => {
    // 1. Obtener sesión actual
    supabase.auth.getSession().then(async ({ data: { session } }) => {

      setUser(session?.user ?? null);


      if(session?.user){

        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();


        setProfile(data);

      } else {

        setProfile(null);

      }

    });

    // 2. Suscribirse a cambios (Login, Logout, Registro)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if(session?.user){
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const links = [
    { name: "Inicio", href: "/" },
    { name: "Productos", href: "/productos" },
    { name: "Nosotros", href: "/nosotros" },
    { name: "Contacto", href: "/contacto" },
  ];

  // Extraemos el primer nombre del usuario para mostrarlo en el botón
  const clientName = user?.user_metadata?.full_name?.split(" ")[0] || "Mi Perfil";
  const trackingHref =
    profile?.role === "admin"
      ? "/admin/pedidos"
      : profile?.role === "customer"
        ? "/pedidos"
        : "/seguimiento";
  const trackingLabel =
    profile?.role === "admin"
      ? "Pedidos"
      : profile?.role === "customer"
        ? "Mis pedidos"
        : "Seguir mi pedido";

  return (
    <header className="header">
      {!pathname.startsWith("/admin") && <DeliveryNotice />}
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

          <Link
            href={trackingHref}
            className="header-utility-link"
            title={trackingLabel}
          >
            <PackageSearch size={18} />
            <span>{trackingLabel}</span>
          </Link>

          {/* Botón dinámico con clase única e independiente */}
          {profile?.role === "admin" ? (

            <Link
              href="/admin/dashboard"
              className="header-utility-link"
              title="Ir al panel administrativo"
            >
              <User size={18} />
              <span>Panel Admin</span>
            </Link>


          ) : profile?.role === "customer" ? (

            <Link
              href="/profile"
              className="header-utility-link"
              title="Ir a mi perfil"
            >
              <User size={18} />
              <span>{clientName}</span>
            </Link>


          ) : (

            <Link
              href="/login"
              className="header-utility-link"
              title="Iniciar sesión"
            >
              <User size={18} />
              <span>Ingresar</span>
            </Link>

          )}

          {/* Carrito */}
          <Link
            href="/carrito"
            className="cart-button"
            aria-label="Mi carrito"
          >
            <ShoppingCart size={21} />
            <span className="cart-button-label">Carrito</span>

            {cartCount > 0 && (
              <span className="cart-badge">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Menú móvil */}
          <button
            className="menu-btn"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            {open ? <X size={30} /> : <Menu size={32} />}
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

          <Link
            href={trackingHref}
            className={`mobile-link ${
              pathname === "/seguimiento" || pathname === "/pedidos"
                ? "active"
                : ""
            }`}
            onClick={() => setOpen(false)}
          >
            {trackingLabel}
          </Link>

          {/* Opción de cuenta en el menú móvil */}
          <div className="mobile-auth-section">
            {profile?.role === "admin" ? (

              <Link
                href="/admin/dashboard"
                className="mobile-link active"
                onClick={() => setOpen(false)}
              >
                Panel Admin
              </Link>

            ) : profile?.role === "customer" ? (

              <Link
                href="/profile"
                className="mobile-link active"
                onClick={() => setOpen(false)}
              >
                Mi Perfil ({clientName})
              </Link>

            ) : (

              <Link
                href="/login"
                className="mobile-link"
                onClick={() => setOpen(false)}
              >
                Iniciar Sesión / Registrarse
              </Link>
            )}
          </div>
        </nav>
      )}

    </header>
  );
}