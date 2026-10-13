"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Play,
  Smartphone,
  TriangleAlert,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  ADMIN_SOUNDS,
  getAdminSoundsEnabled,
  getAdminSoundsVolume,
  playAdminSound,
  setAdminSoundsEnabled,
  setAdminSoundsVolume,
} from "@/lib/adminSounds";

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
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export default function AlertsSettingsTab() {
  const [state, setState] = useState<PushState>("checking");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [soundsEnabled, setSoundsEnabledState] = useState(true);
  const [soundVolume, setSoundVolumeState] = useState(0.85);
  const [soundMessage, setSoundMessage] = useState("");

  useEffect(() => {
    void checkPushState();
    setSoundsEnabledState(getAdminSoundsEnabled());
    setSoundVolumeState(getAdminSoundsVolume());
  }, []);

  const stateCopy = useMemo(() => {
    switch (state) {
      case "active":
        return { title: "Notificaciones activas en este dispositivo", description: "Recibirás una notificación del sistema cuando entre un pedido nuevo." };
      case "denied":
        return { title: "Notificaciones bloqueadas", description: "El navegador tiene bloqueado el permiso. Habilitalo desde los ajustes del sitio o del dispositivo." };
      case "needs-install":
        return { title: "Instalá Altavera en la pantalla de inicio", description: "En iPhone y iPad las notificaciones web funcionan desde la app instalada en la pantalla de inicio." };
      case "unsupported":
        return { title: "Este navegador no admite Web Push", description: "Probá con una versión reciente de Safari, Chrome, Edge o Firefox." };
      case "misconfigured":
        return { title: "Falta configurar Web Push en el servidor", description: "El código está instalado, pero todavía faltan las llaves VAPID en el entorno." };
      default:
        return { title: "Activar notificaciones de pedidos", description: "Este dispositivo podrá avisarte incluso cuando no tengas abierto el panel administrativo." };
    }
  }, [state]);

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
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
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
      const configResponse = await fetch("/api/admin/push/config", { cache: "no-store" });
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
      const configResponse = await fetch("/api/admin/push/config", { cache: "no-store" });
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
      setMessage(error instanceof Error ? error.message : "No se pudieron activar las notificaciones");
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
      if (!response.ok) throw new Error(data.error ?? "No se pudo enviar la prueba");
      setMessage("Prueba enviada. Debería aparecer como notificación del sistema en unos segundos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar la notificación de prueba");
    } finally {
      setWorking(false);
    }
  }

  async function disableNotifications() {
    if (!subscription) return;
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
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
      setMessage(error instanceof Error ? error.message : "No se pudieron desactivar las notificaciones");
    } finally {
      setWorking(false);
    }
  }

  function togglePanelSounds() {
    const nextValue = !soundsEnabled;
    setAdminSoundsEnabled(nextValue);
    setSoundsEnabledState(nextValue);
    setSoundMessage(nextValue ? "Sonidos del panel activados." : "Sonidos del panel desactivados.");
  }

  function changeSoundVolume(value: number) {
    setSoundVolumeState(value);
    setAdminSoundsVolume(value);
  }

  async function testPanelSound(kind: "new-order" | "payment-confirmed") {
    setSoundMessage("");
    const played = await playAdminSound(kind, { force: true });
    setSoundMessage(played ? `Reproduciendo ${ADMIN_SOUNDS[kind].label}.` : "El navegador bloqueó el audio. Tocá nuevamente el botón para habilitarlo.");
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
    <div className="settings-tab-stack">
      <section className="admin-setting-card">
        <div className={`admin-setting-icon admin-setting-icon--${state}`} aria-hidden="true">
          <StatusIcon size={24} strokeWidth={1.8} />
        </div>
        <div className="admin-setting-content">
          <span className="admin-setting-kicker">Nuevos pedidos</span>
          <h2>{stateCopy.title}</h2>
          <p>{stateCopy.description}</p>
          {state === "needs-install" && (
            <div className="admin-setting-note">En Safari: Compartir → Agregar a pantalla de inicio. Abrí Altavera desde el nuevo icono y volvé aquí.</div>
          )}
          {message && <div className="admin-setting-message">{message}</div>}
          <div className="admin-setting-actions">
            {state === "active" ? (
              <>
                <button type="button" className="admin-setting-button" onClick={() => void sendTestNotification()} disabled={working}>
                  <Bell size={18} />
                  {working ? "Enviando..." : "Enviar prueba"}
                </button>
                <button type="button" className="admin-setting-button admin-setting-button--secondary" onClick={() => void disableNotifications()} disabled={working}>
                  <BellOff size={18} />
                  Desactivar en este dispositivo
                </button>
              </>
            ) : state === "inactive" ? (
              <button type="button" className="admin-setting-button" onClick={() => void enableNotifications()} disabled={working}>
                <Bell size={18} />
                {working ? "Activando..." : "Activar notificaciones"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="admin-setting-card admin-sound-card">
        <div className="admin-setting-icon" aria-hidden="true">
          {soundsEnabled ? <Volume2 size={24} strokeWidth={1.8} /> : <VolumeX size={24} strokeWidth={1.8} />}
        </div>
        <div className="admin-setting-content">
          <span className="admin-setting-kicker">Sonidos del panel</span>
          <h2>Alertas audibles cuando el admin está abierto</h2>
          <p>Altavera usa un sonido para pedidos nuevos y otro para pagos confirmados.</p>

          <div className="admin-sound-toggle-row">
            <button type="button" className={`admin-sound-toggle${soundsEnabled ? " is-active" : ""}`} onClick={togglePanelSounds} aria-pressed={soundsEnabled}>
              {soundsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              {soundsEnabled ? "Sonidos activados" : "Sonidos desactivados"}
            </button>
            <label className="admin-sound-volume">
              <span>Volumen</span>
              <input type="range" min="0" max="1" step="0.05" value={soundVolume} onChange={(event) => changeSoundVolume(Number(event.target.value))} aria-label="Volumen de sonidos del panel" />
              <strong>{Math.round(soundVolume * 100)}%</strong>
            </label>
          </div>

          <div className="admin-sound-options">
            {(["new-order", "payment-confirmed"] as const).map((kind) => (
              <article className="admin-sound-option" key={kind}>
                <div>
                  <span>{kind === "new-order" ? "Nuevo pedido" : "Pago confirmado"}</span>
                  <strong>{ADMIN_SOUNDS[kind].label}</strong>
                  <a href={ADMIN_SOUNDS[kind].sourcePage} target="_blank" rel="noreferrer">{ADMIN_SOUNDS[kind].sourceLabel}</a>
                </div>
                <button type="button" className="admin-setting-button admin-setting-button--secondary" onClick={() => void testPanelSound(kind)}>
                  <Play size={17} />
                  Probar
                </button>
              </article>
            ))}
          </div>

          {soundMessage && <div className="admin-setting-message">{soundMessage}</div>}
        </div>
      </section>

      <section className="admin-setting-help">
        <h2>Cómo funciona</h2>
        <p>Cada celular o computadora se activa por separado. Podés habilitar las notificaciones en más de un dispositivo administrador.</p>
        <p>El sonido y la vibración dependen de la configuración del sistema operativo y del navegador.</p>
      </section>
    </div>
  );
}
