"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, BellOff, CheckCircle2, Smartphone, TriangleAlert } from "lucide-react";
import "../admin.css";
import "./configuracion.css";

type PushState =
  | "checking"
  | "unsupported"
  | "needs-install"
  | "denied"
  | "inactive"
  | "active"
  | "misconfigured";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export default function AdminConfiguracionPage() {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const stateCopy = useMemo(() => {
    switch (state) {
      case "active":
        return {
          title: "Notificaciones activas en este dispositivo",
          description:
            "Recibirás una notificación del sistema cuando entre un pedido nuevo.",
        };
      case "denied":
        return {
          title: "Notificaciones bloqueadas",
          description:
            "El navegador tiene bloqueado el permiso. Debés habilitarlo desde los ajustes del sitio o del dispositivo.",
        };
      case "needs-install":
        return {
          title: "Instalá Altavera en la pantalla de inicio",
          description:
            "En iPhone y iPad las notificaciones web funcionan desde la app de Altavera instalada en la pantalla de inicio.",
        };
      case "unsupported":
        return {
          title: "Este navegador no admite Web Push",
          description:
            "Probá con una versión reciente de Safari, Chrome, Edge o Firefox.",
        };
      case "misconfigured":
        return {
          title: "Falta configurar Web Push en el servidor",
          description:
            "El código ya está instalado, pero todavía faltan las llaves VAPID en el entorno.",
        };
      default:
        return {
          title: "Activar notificaciones de pedidos",
          description:
            "Este dispositivo podrá avisarte incluso cuando no tengas abierto el panel de administración.",
        };
    }
  }, [state]);

  useEffect(() => {
    void checkPushState();
  }, []);

  async function getRegistration() {
    return navigator.serviceWorker.register("/admin-push-sw.js", { scope: "/" });
  }

  async function syncSubscription(currentSubscription: PushSubscription) {
    const response = await fetch("/api/admin/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentSubscription.toJSON()),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "No se pudo registrar este dispositivo");
    }
  }

  async function checkPushState() {
    setMessage("");

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }

    if (isIosDevice() && !isStandalone()) {
      setState("needs-install");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    try {
      const configResponse = await fetch("/api/admin/push/config", {
        cache: "no-store",
      });

      if (!configResponse.ok) {
        setState("misconfigured");
        return;
      }

      const registration = await getRegistration();
      const currentSubscription = await registration.pushManager.getSubscription();
      setSubscription(currentSubscription);

      if (currentSubscription && Notification.permission === "granted") {
        await syncSubscription(currentSubscription);
        setState("active");
      } else {
        setState("inactive");
      }
    } catch (error) {
      console.error("ERROR REVISANDO NOTIFICACIONES:", error);
      setState("inactive");
    }
  }

  async function enableNotifications() {
    setWorking(true);
    setMessage("");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "inactive");
        return;
      }

      const configResponse = await fetch("/api/admin/push/config", {
        cache: "no-store",
      });
      const config = await configResponse.json();

      if (!configResponse.ok || !config.publicKey) {
        setState("misconfigured");
        throw new Error(config.error ?? "Falta configurar Web Push");
      }

      const registration = await getRegistration();
      let currentSubscription = await registration.pushManager.getSubscription();

      if (!currentSubscription) {
        currentSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        });
      }

      await syncSubscription(currentSubscription);
      setSubscription(currentSubscription);
      setState("active");
      setMessage("Este dispositivo ya recibirá los nuevos pedidos.");
    } catch (error) {
      console.error("ERROR ACTIVANDO NOTIFICACIONES:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron activar las notificaciones"
      );
    } finally {
      setWorking(false);
    }
  }

  async function sendTestNotification() {
    setWorking(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/push/test", { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo enviar la prueba");
      }

      setMessage("Prueba enviada. Debería aparecer como notificación del sistema en unos segundos.");
    } catch (error) {
      console.error("ERROR ENVIANDO PRUEBA DE NOTIFICACIONES:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la notificación de prueba"
      );
    } finally {
      setWorking(false);
    }
  }

  async function disableNotifications() {
    if (!subscription) return;

    setWorking(true);
    setMessage("");

    try {
      const endpoint = subscription.endpoint;
      const response = await fetch("/api/admin/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo desactivar este dispositivo");
      }

      await subscription.unsubscribe();
      setSubscription(null);
      setState("inactive");
      setMessage("Notificaciones desactivadas en este dispositivo.");
    } catch (error) {
      console.error("ERROR DESACTIVANDO NOTIFICACIONES:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron desactivar las notificaciones"
      );
    } finally {
      setWorking(false);
    }
  }

  const StatusIcon =
    state === "active"
      ? CheckCircle2
      : state === "denied" || state === "unsupported" || state === "misconfigured"
        ? TriangleAlert
        : state === "needs-install"
          ? Smartphone
          : Bell;

  return (
    <main className="admin-container admin-settings-page">
      <header className="admin-page-header admin-settings-header">
        <div>
          <Link className="admin-back-link" href="/admin/dashboard">
            <ArrowLeft size={17} />
            Volver al panel
          </Link>
          <h1>Configuración</h1>
          <p>Ajustes del panel administrativo de Altavera.</p>
        </div>
      </header>

      <section className="admin-setting-card">
        <div className={`admin-setting-icon admin-setting-icon--${state}`} aria-hidden="true">
          <StatusIcon size={24} strokeWidth={1.8} />
        </div>

        <div className="admin-setting-content">
          <span className="admin-setting-kicker">Nuevos pedidos</span>
          <h2>{stateCopy.title}</h2>
          <p>{stateCopy.description}</p>

          {state === "needs-install" && (
            <div className="admin-setting-note">
              En Safari: Compartir → Agregar a pantalla de inicio. Abrí Altavera desde el nuevo icono y volvé a esta sección para activar las notificaciones.
            </div>
          )}

          {message && <div className="admin-setting-message">{message}</div>}

          <div className="admin-setting-actions">
            {state === "active" ? (
              <>
                <button
                  type="button"
                  className="admin-setting-button"
                  onClick={sendTestNotification}
                  disabled={working}
                >
                  <Bell size={18} />
                  {working ? "Enviando..." : "Enviar prueba"}
                </button>
                <button
                  type="button"
                  className="admin-setting-button admin-setting-button--secondary"
                  onClick={disableNotifications}
                  disabled={working}
                >
                  <BellOff size={18} />
                  Desactivar en este dispositivo
                </button>
              </>
            ) : state === "inactive" ? (
              <button
                type="button"
                className="admin-setting-button"
                onClick={enableNotifications}
                disabled={working}
              >
                <Bell size={18} />
                {working ? "Activando..." : "Activar notificaciones"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="admin-setting-help">
        <h2>Cómo funciona</h2>
        <p>
          Cada celular o computadora se activa por separado. Podés habilitar las notificaciones en tu dispositivo y también en el de otra persona administradora.
        </p>
        <p>
          El sonido y la vibración dependen de la configuración de notificaciones del sistema operativo. Altavera solicita una notificación visible y no silenciosa, pero el navegador no puede forzar el volumen del dispositivo.
        </p>
      </section>
    </main>
  );
}
