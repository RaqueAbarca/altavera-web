"use client";

import { useEffect, useState } from "react";
import { FaSignOutAlt } from "react-icons/fa";
import { supabase } from "@/lib/supabase";

export default function AccountActions() {
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  const [marketingLoading, setMarketingLoading] = useState(true);
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [marketingMessage, setMarketingMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/marketing/preferences", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudieron cargar tus preferencias.");
        }

        if (active) {
          setMarketingEnabled(data.enabled === true);
        }
      } catch (error) {
        if (active) {
          setMarketingMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar tus preferencias."
          );
        }
      } finally {
        if (active) setMarketingLoading(false);
      }
    }

    void loadPreferences();
    return () => {
      active = false;
    };
  }, []);

  async function updateMarketing(enabled: boolean) {
    if (marketingSaving) return;

    setMarketingSaving(true);
    setMarketingMessage("");

    try {
      const response = await fetch("/api/marketing/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar la preferencia.");
      }

      setMarketingEnabled(enabled);
      setMarketingMessage(
        enabled
          ? "Listo. Puedes recibir ofertas y novedades de Altavera."
          : "Listo. Dejaste de recibir promociones. Los correos relacionados con tus pedidos seguirán llegando."
      );
    } catch (error) {
      setMarketingMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la preferencia."
      );
    } finally {
      setMarketingSaving(false);
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error al cerrar sesión:", error);
      return;
    }

    window.location.replace("/");
  }

  return (
    <section className="profile-card">
      <h2>Cuenta</h2>

      <div className="marketing-preference">
        <div>
          <strong>Ofertas y novedades</strong>
          <p>
            Decide si quieres recibir promociones por correo electrónico y/o WhatsApp.
            Los mensajes necesarios para gestionar tus pedidos no dependen de esta opción.
          </p>
        </div>

        <label className="marketing-toggle">
          <input
            type="checkbox"
            checked={marketingEnabled}
            disabled={marketingLoading || marketingSaving}
            onChange={(event) => void updateMarketing(event.target.checked)}
          />
          <span>{marketingLoading ? "Cargando..." : marketingEnabled ? "Activadas" : "Desactivadas"}</span>
        </label>
      </div>

      {marketingMessage && (
        <p className="marketing-preference__message" role="status">
          {marketingMessage}
        </p>
      )}

      <button className="logout-btn" onClick={handleLogout}>
        <FaSignOutAlt />
        Cerrar sesión
      </button>
    </section>
  );
}
