"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, BellOff, CheckCircle2, Play, Save, Smartphone, TriangleAlert, Truck, Volume2, VolumeX, WalletCards } from "lucide-react";
import {
  ADMIN_SOUNDS,
  getAdminSoundsEnabled,
  getAdminSoundsVolume,
  playAdminSound,
  setAdminSoundsEnabled,
  setAdminSoundsVolume,
} from "@/lib/adminSounds";
import type { AdminAppSettings, BankAccountSettings } from "@/lib/appSettings";
import "../admin.css";
import "./configuracion.css";


const EMPTY_BANK_ACCOUNT: BankAccountSettings = {
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  iban: "",
};

const EMPTY_OPERATIONAL_SETTINGS: AdminAppSettings = {
  deliveryFlatFeeCrc: null,
  sinpePhone: "",
  sinpeHolder: "",
  bankAccounts: [
    { ...EMPTY_BANK_ACCOUNT },
    { ...EMPTY_BANK_ACCOUNT },
  ],
  whatsappPhone: "",
  contactEmail: "",
};

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
  const [soundsEnabled, setSoundsEnabledState] = useState(true);
  const [soundVolume, setSoundVolumeState] = useState(0.85);
  const [soundMessage, setSoundMessage] = useState("");
  const [operationalSettings, setOperationalSettings] = useState<AdminAppSettings>(
    EMPTY_OPERATIONAL_SETTINGS
  );
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [operationalSaving, setOperationalSaving] = useState(false);
  const [operationalMessage, setOperationalMessage] = useState("");

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
    void loadOperationalSettings();
    setSoundsEnabledState(getAdminSoundsEnabled());
    setSoundVolumeState(getAdminSoundsVolume());
  }, []);

  async function loadOperationalSettings() {
    setOperationalLoading(true);
    setOperationalMessage("");

    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la configuración operativa");
      }

      setOperationalSettings(data as AdminAppSettings);
    } catch (error) {
      setOperationalMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la configuración operativa"
      );
    } finally {
      setOperationalLoading(false);
    }
  }

  function updateOperationalSetting<K extends keyof AdminAppSettings>(
    key: K,
    value: AdminAppSettings[K]
  ) {
    setOperationalSettings((current) => ({ ...current, [key]: value }));
    setOperationalMessage("");
  }

  function updateBankAccount(
    index: number,
    key: keyof BankAccountSettings,
    value: string
  ) {
    setOperationalSettings((current) => {
      const bankAccounts = [...current.bankAccounts];
      bankAccounts[index] = {
        ...(bankAccounts[index] ?? EMPTY_BANK_ACCOUNT),
        [key]: value,
      };
      return { ...current, bankAccounts };
    });
    setOperationalMessage("");
  }

  async function saveOperationalSettings() {
    setOperationalSaving(true);
    setOperationalMessage("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operationalSettings),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar la configuración");
      }

      const { ok: _ok, ...saved } = data as AdminAppSettings & { ok?: boolean };
      setOperationalSettings(saved);
      setOperationalMessage("Configuración guardada. Los cambios ya están activos en la tienda.");
    } catch (error) {
      setOperationalMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuración"
      );
    } finally {
      setOperationalSaving(false);
    }
  }

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
    setSoundMessage(
      played
        ? `Reproduciendo ${ADMIN_SOUNDS[kind].label}.`
        : "El navegador bloqueó el audio. Tocá nuevamente el botón para habilitarlo."
    );
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

      <section className="admin-setting-card admin-business-card">
        <div className="admin-setting-icon" aria-hidden="true">
          <Truck size={24} strokeWidth={1.8} />
        </div>

        <div className="admin-setting-content">
          <span className="admin-setting-kicker">Entregas</span>
          <h2>Tarifa de envío</h2>
          <p>
            Este monto se usa automáticamente en carrito, checkout y al crear el pedido.
            Ya no depende de una variable de Vercel.
          </p>

          <div className="admin-business-fields admin-business-fields--compact">
            <label className="admin-business-field">
              <span>Tarifa fija actual</span>
              <div className="admin-money-input">
                <span>₡</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={operationalSettings.deliveryFlatFeeCrc ?? ""}
                  onChange={(event) =>
                    updateOperationalSetting(
                      "deliveryFlatFeeCrc",
                      event.target.value === "" ? null : Number(event.target.value)
                    )
                  }
                  placeholder="Ej: 1500"
                  disabled={operationalLoading}
                />
              </div>
              <small>Puede ser ₡0 si decidís ofrecer envío gratuito.</small>
            </label>
          </div>

          <div className="admin-setting-note">
            Por ahora Altavera usa tarifa fija. La configuración quedó guardada en Supabase para que más adelante podamos cambiarla a cálculo por distancia usando la ubicación del cliente, sin volver a depender de Vercel.
          </div>

          {operationalMessage && (
            <div className="admin-setting-message">{operationalMessage}</div>
          )}

          <div className="admin-setting-actions">
            <button
              type="button"
              className="admin-setting-button"
              onClick={saveOperationalSettings}
              disabled={operationalLoading || operationalSaving}
            >
              <Save size={18} />
              {operationalSaving ? "Guardando..." : "Guardar tarifa"}
            </button>
          </div>
        </div>
      </section>

      <section className="admin-setting-card admin-business-card">
        <div className="admin-setting-icon" aria-hidden="true">
          <WalletCards size={24} strokeWidth={1.8} />
        </div>

        <div className="admin-setting-content">
          <span className="admin-setting-kicker">Pagos y contacto</span>
          <h2>Datos públicos de Altavera</h2>
          <p>
            Estos datos pueden mostrarse al cliente. Guardarlos aquí permite cambiarlos sin hacer un deployment.
          </p>

          <div className="admin-business-subsection">
            <h3>SINPE Móvil</h3>
            <div className="admin-business-fields">
              <label className="admin-business-field">
                <span>Número SINPE</span>
                <input
                  type="text"
                  value={operationalSettings.sinpePhone}
                  onChange={(event) => updateOperationalSetting("sinpePhone", event.target.value)}
                  placeholder="Ej: 8888 8888"
                  disabled={operationalLoading}
                />
              </label>
              <label className="admin-business-field">
                <span>Titular</span>
                <input
                  type="text"
                  value={operationalSettings.sinpeHolder}
                  onChange={(event) => updateOperationalSetting("sinpeHolder", event.target.value)}
                  placeholder="Nombre del titular"
                  disabled={operationalLoading}
                />
              </label>
            </div>
          </div>

          <div className="admin-business-subsection">
            <h3>Transferencia bancaria</h3>
            <p className="admin-business-help">
              Puedes configurar hasta dos cuentas. En Banco Nacional, el número de cuenta es útil para transferencias entre cuentas BN; el IBAN sirve para transferencias desde otros bancos.
            </p>

            <div className="admin-bank-accounts">
              {operationalSettings.bankAccounts.map((account, index) => (
                <div className="admin-bank-account-card" key={index}>
                  <div className="admin-bank-account-card__heading">
                    <strong>Cuenta bancaria {index + 1}</strong>
                    {index === 1 && <span>Opcional</span>}
                  </div>

                  <div className="admin-business-fields">
                    <label className="admin-business-field">
                      <span>Banco</span>
                      <input
                        type="text"
                        value={account.bankName}
                        onChange={(event) => updateBankAccount(index, "bankName", event.target.value)}
                        placeholder={index === 0 ? "Ej: Banco Nacional" : "Ej: BAC"}
                        disabled={operationalLoading}
                      />
                    </label>
                    <label className="admin-business-field">
                      <span>Titular de la cuenta</span>
                      <input
                        type="text"
                        value={account.accountHolder}
                        onChange={(event) => updateBankAccount(index, "accountHolder", event.target.value)}
                        placeholder="Nombre del titular"
                        disabled={operationalLoading}
                      />
                    </label>
                    <label className="admin-business-field">
                      <span>Número de cuenta</span>
                      <input
                        type="text"
                        value={account.accountNumber}
                        onChange={(event) => updateBankAccount(index, "accountNumber", event.target.value)}
                        placeholder="Ej: 200-01-..."
                        disabled={operationalLoading}
                      />
                    </label>
                    <label className="admin-business-field">
                      <span>Cuenta IBAN</span>
                      <input
                        type="text"
                        value={account.iban}
                        onChange={(event) => updateBankAccount(index, "iban", event.target.value)}
                        placeholder="CR..."
                        disabled={operationalLoading}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-business-subsection">
            <h3>Atención al cliente</h3>
            <div className="admin-business-fields">
              <label className="admin-business-field">
                <span>WhatsApp de Altavera</span>
                <input
                  type="tel"
                  value={operationalSettings.whatsappPhone}
                  onChange={(event) => updateOperationalSetting("whatsappPhone", event.target.value)}
                  placeholder="Ej: 8888 8888"
                  disabled={operationalLoading}
                />
                <small>Se usa también para recibir comprobantes de pago.</small>
              </label>
              <label className="admin-business-field">
                <span>Correo de atención</span>
                <input
                  type="email"
                  value={operationalSettings.contactEmail}
                  onChange={(event) => updateOperationalSetting("contactEmail", event.target.value)}
                  placeholder="Ej: hola@altaveraenlinea.com"
                  disabled={operationalLoading}
                />
              </label>
            </div>
          </div>

          {operationalMessage && (
            <div className="admin-setting-message">{operationalMessage}</div>
          )}

          <div className="admin-setting-actions">
            <button
              type="button"
              className="admin-setting-button"
              onClick={saveOperationalSettings}
              disabled={operationalLoading || operationalSaving}
            >
              <Save size={18} />
              {operationalSaving ? "Guardando..." : "Guardar datos"}
            </button>
          </div>
        </div>
      </section>

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

      <section className="admin-setting-card admin-sound-card">
        <div className="admin-setting-icon" aria-hidden="true">
          {soundsEnabled ? <Volume2 size={24} strokeWidth={1.8} /> : <VolumeX size={24} strokeWidth={1.8} />}
        </div>

        <div className="admin-setting-content">
          <span className="admin-setting-kicker">Sonidos del panel</span>
          <h2>Alertas audibles cuando el admin está abierto</h2>
          <p>
            Altavera usa un sonido para pedidos nuevos y otro para pagos confirmados mientras tenés abierto el panel administrativo.
          </p>

          <div className="admin-sound-toggle-row">
            <button
              type="button"
              className={`admin-sound-toggle${soundsEnabled ? " is-active" : ""}`}
              onClick={togglePanelSounds}
              aria-pressed={soundsEnabled}
            >
              {soundsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              {soundsEnabled ? "Sonidos activados" : "Sonidos desactivados"}
            </button>

            <label className="admin-sound-volume">
              <span>Volumen</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(event) => changeSoundVolume(Number(event.target.value))}
                aria-label="Volumen de sonidos del panel"
              />
              <strong>{Math.round(soundVolume * 100)}%</strong>
            </label>
          </div>

          <div className="admin-sound-options">
            <article className="admin-sound-option">
              <div>
                <span>Nuevo pedido</span>
                <strong>{ADMIN_SOUNDS["new-order"].label}</strong>
                <a href={ADMIN_SOUNDS["new-order"].sourcePage} target="_blank" rel="noreferrer">
                  {ADMIN_SOUNDS["new-order"].sourceLabel}
                </a>
              </div>
              <button
                type="button"
                className="admin-setting-button admin-setting-button--secondary"
                onClick={() => void testPanelSound("new-order")}
              >
                <Play size={17} />
                Probar
              </button>
            </article>

            <article className="admin-sound-option">
              <div>
                <span>Pago confirmado</span>
                <strong>{ADMIN_SOUNDS["payment-confirmed"].label}</strong>
                <a href={ADMIN_SOUNDS["payment-confirmed"].sourcePage} target="_blank" rel="noreferrer">
                  {ADMIN_SOUNDS["payment-confirmed"].sourceLabel}
                </a>
              </div>
              <button
                type="button"
                className="admin-setting-button admin-setting-button--secondary"
                onClick={() => void testPanelSound("payment-confirmed")}
              >
                <Play size={17} />
                Probar
              </button>
            </article>
          </div>

          {soundMessage && <div className="admin-setting-message">{soundMessage}</div>}

          <div className="admin-setting-note">
            El sonido de pago se reproduce actualmente cuando un administrador confirma el pago del pedido. Si después conectamos una confirmación automática de SINPE o una pasarela, podemos dispararlo en el instante real del pago.
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
