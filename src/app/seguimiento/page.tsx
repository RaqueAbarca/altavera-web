"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LogIn,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import "./seguimiento-entry.css";

type LookupResponse = {
  id?: string;
  accessToken?: string;
  error?: string;
};

export default function SeguimientoPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orderNumber, setOrderNumber] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (session?.user) {
        router.replace("/pedidos");
        return;
      }

      setCheckingAuth(false);
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, contact }),
      });

      const data = (await response.json()) as LookupResponse;

      if (!response.ok || !data.id || !data.accessToken) {
        throw new Error(data.error ?? "No pudimos encontrar ese pedido.");
      }

      window.location.assign(
        `/seguimiento/${encodeURIComponent(data.id)}#token=${encodeURIComponent(data.accessToken)}`
      );
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "No pudimos encontrar ese pedido."
      );
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="container seguimiento-entry-page seguimiento-entry-state">
        Preparando tus pedidos...
      </main>
    );
  }

  return (
    <main className="container seguimiento-entry-page">
      <section className="seguimiento-entry-hero">
        <span className="seguimiento-entry-icon" aria-hidden="true">
          <PackageSearch size={28} />
        </span>
        <span className="seguimiento-entry-eyebrow">Seguimiento</span>
        <h1>Seguí tu pedido</h1>
        <p>
          Consulta en qué etapa se encuentra tu compra usando los datos con los
          que hiciste el pedido.
        </p>
      </section>

      <section className="seguimiento-entry-card">
        <form onSubmit={handleSubmit} noValidate>
          <label className="seguimiento-entry-field">
            <span>Número de pedido</span>
            <input
              type="text"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder="Ej: A12B34CD"
              autoCapitalize="characters"
              autoComplete="off"
              required
            />
            <small>Lo encuentras en la pantalla y correo de confirmación.</small>
          </label>

          <label className="seguimiento-entry-field">
            <span>Correo o WhatsApp</span>
            <input
              type="text"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="correo@ejemplo.com o 8888-8888"
              autoComplete="email"
              required
            />
            <small>
              Puedes usar cualquiera de los dos que registraste al hacer la compra.
            </small>
          </label>

          {error && (
            <div className="seguimiento-entry-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="seguimiento-entry-submit"
            disabled={loading}
          >
            {loading ? "Buscando pedido..." : "Ver estado de mi pedido"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="seguimiento-entry-security">
          <ShieldCheck size={18} aria-hidden="true" />
          <p>
            Para proteger tus datos, necesitamos que el número de pedido coincida
            con el correo o WhatsApp registrado.
          </p>
        </div>
      </section>

      <section className="seguimiento-entry-account">
        <div>
          <span>¿Tienes una cuenta?</span>
          <p>Inicia sesión para ver todos tus pedidos sin escribir estos datos.</p>
        </div>
        <Link href="/login?redirect=/pedidos">
          <LogIn size={17} />
          Iniciar sesión
        </Link>
      </section>
    </main>
  );
}
