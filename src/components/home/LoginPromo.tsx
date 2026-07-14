"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPromo() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  // Si está cargando o si el usuario ya inició sesión, no mostramos el banner
  if (loading || user) return null;

  return (
    <section className="login-promo-banner container">
      <div className="promo-content">
        <h3> ¡Pedí más rápido y seguí tus órdenes!</h3>
        <p>Creá tu cuenta en un minuto para guardar tu dirección, WhatsApp y ver el estado de tus pedidos en vivo.</p>
      </div>
      <Link href="/login" className="promo-btn">
        Crear mi cuenta / Ingresar
      </Link>
    </section>
  );
}