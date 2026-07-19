"use client";

import "./header.css";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/lib/supabase"; // 👈 Importamos supabase
import {
  Menu,
  X,
  ShoppingCart,
  MessageCircle,
  User, // 👈 Importamos icono de usuario
} from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null); // 👈 Estado para guardar el usuario logueado
  const [profile, setProfile] = useState<any>(null);

  const { cart } = useCart();

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

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

          {/* Botón dinámico con clase única e independiente */}
          {profile?.role === "admin" ? (

            <Link
              href="/admin/dashboard"
              className="header-auth-btn"
              title="Ir al panel administrativo"
            >
              <User size={18} />
              <span>Panel Admin</span>
            </Link>


          ) : profile?.role === "customer" ? (

            <Link
              href="/profile"
              className="header-auth-btn"
              title="Ir a mi perfil"
            >
              <User size={18} />
              <span>{clientName}</span>
            </Link>


          ) : (

            <Link
              href="/login"
              className="header-auth-btn"
              title="Iniciar sesión"
            >
              <User size={18} />
              <span>Ingresar</span>
            </Link>

          )}

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
          <Link
            href="/carrito"
            className="cart-button"
            aria-label="Mi carrito"
          >
            <ShoppingCart size={30} />

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