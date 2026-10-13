"use client";

import { useEffect, useState } from "react";
import { Save, WalletCards } from "lucide-react";
import {
  EMPTY_BANK_ACCOUNT,
  EMPTY_DELIVERY_DISTANCE_SETTINGS,
  type AdminAppSettings,
  type BankAccountSettings,
} from "@/lib/appSettings";

const EMPTY_SETTINGS: AdminAppSettings = {
  deliveryMode: "flat",
  deliveryFlatFeeCrc: null,
  deliveryDistance: {
    ...EMPTY_DELIVERY_DISTANCE_SETTINGS,
    fuelPricesCrcPerLiter: { ...EMPTY_DELIVERY_DISTANCE_SETTINGS.fuelPricesCrcPerLiter },
    vehicles: EMPTY_DELIVERY_DISTANCE_SETTINGS.vehicles.map((vehicle) => ({ ...vehicle })),
  },
  deliverySchedule: [],
  deliveryScheduleConfigured: false,
  sinpePhone: "",
  sinpeHolder: "",
  bankAccounts: [{ ...EMPTY_BANK_ACCOUNT }, { ...EMPTY_BANK_ACCOUNT }],
  whatsappPhone: "",
  contactEmail: "",
};

export default function BusinessSettingsTab() {
  const [settings, setSettings] = useState<AdminAppSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la configuración");
      const loaded = data as AdminAppSettings;
      const bankAccounts = [...(loaded.bankAccounts ?? [])];
      while (bankAccounts.length < 2) bankAccounts.push({ ...EMPTY_BANK_ACCOUNT });
      setSettings({ ...EMPTY_SETTINGS, ...loaded, bankAccounts: bankAccounts.slice(0, 2) });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración");
    } finally {
      setLoading(false);
    }
  }

  function updateSetting<K extends keyof AdminAppSettings>(key: K, value: AdminAppSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  function updateBankAccount(index: number, key: keyof BankAccountSettings, value: string) {
    setSettings((current) => {
      const bankAccounts = [...current.bankAccounts];
      bankAccounts[index] = { ...(bankAccounts[index] ?? EMPTY_BANK_ACCOUNT), [key]: value };
      return { ...current, bankAccounts };
    });
    setMessage("");
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sinpePhone: settings.sinpePhone,
          sinpeHolder: settings.sinpeHolder,
          bankAccounts: settings.bankAccounts,
          whatsappPhone: settings.whatsappPhone,
          contactEmail: settings.contactEmail,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar la configuración");
      setMessage("Datos guardados. Los cambios ya están activos en la tienda.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-setting-card admin-business-card">
      <div className="admin-setting-icon" aria-hidden="true">
        <WalletCards size={24} strokeWidth={1.8} />
      </div>
      <div className="admin-setting-content">
        <span className="admin-setting-kicker">Pagos y contacto</span>
        <h2>Datos públicos de Altavera</h2>
        <p>Estos datos pueden mostrarse al cliente y se pueden cambiar sin hacer un deployment.</p>

        <div className="admin-business-subsection">
          <h3>SINPE Móvil</h3>
          <div className="admin-business-fields">
            <label className="admin-business-field">
              <span>Número SINPE</span>
              <input
                type="text"
                value={settings.sinpePhone}
                onChange={(event) => updateSetting("sinpePhone", event.target.value)}
                placeholder="Ej: 8888 8888"
                disabled={loading}
              />
            </label>
            <label className="admin-business-field">
              <span>Titular</span>
              <input
                type="text"
                value={settings.sinpeHolder}
                onChange={(event) => updateSetting("sinpeHolder", event.target.value)}
                placeholder="Nombre del titular"
                disabled={loading}
              />
            </label>
          </div>
        </div>

        <div className="admin-business-subsection">
          <h3>Transferencia bancaria</h3>
          <p className="admin-business-help">
            Podés configurar hasta dos cuentas. El número de cuenta puede servir para transferencias internas y el IBAN para transferencias desde otros bancos.
          </p>
          <div className="admin-bank-accounts">
            {settings.bankAccounts.map((account, index) => (
              <div className="admin-bank-account-card" key={index}>
                <div className="admin-bank-account-card__heading">
                  <strong>Cuenta bancaria {index + 1}</strong>
                  {index === 1 && <span>Opcional</span>}
                </div>
                <div className="admin-business-fields">
                  <label className="admin-business-field">
                    <span>Banco</span>
                    <input value={account.bankName} onChange={(event) => updateBankAccount(index, "bankName", event.target.value)} placeholder="Ej: Banco Nacional" disabled={loading} />
                  </label>
                  <label className="admin-business-field">
                    <span>Titular de la cuenta</span>
                    <input value={account.accountHolder} onChange={(event) => updateBankAccount(index, "accountHolder", event.target.value)} placeholder="Nombre del titular" disabled={loading} />
                  </label>
                  <label className="admin-business-field">
                    <span>Número de cuenta</span>
                    <input value={account.accountNumber} onChange={(event) => updateBankAccount(index, "accountNumber", event.target.value)} placeholder="Ej: 200-01-..." disabled={loading} />
                  </label>
                  <label className="admin-business-field">
                    <span>Cuenta IBAN</span>
                    <input value={account.iban} onChange={(event) => updateBankAccount(index, "iban", event.target.value)} placeholder="CR..." disabled={loading} />
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
              <span>WhatsApp / teléfono</span>
              <input
                type="tel"
                value={settings.whatsappPhone}
                onChange={(event) => updateSetting("whatsappPhone", event.target.value)}
                placeholder="Ej: 8888 8888"
                disabled={loading}
              />
              <small>No es el número de SINPE. También puede recibir comprobantes de pago.</small>
            </label>
            <label className="admin-business-field">
              <span>Correo de atención</span>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(event) => updateSetting("contactEmail", event.target.value)}
                placeholder="Ej: hola@altaveraenlinea.com"
                disabled={loading}
              />
            </label>
          </div>
        </div>

        {message && <div className="admin-setting-message">{message}</div>}
        <div className="admin-setting-actions">
          <button type="button" className="admin-setting-button" onClick={() => void saveSettings()} disabled={loading || saving}>
            <Save size={18} />
            {saving ? "Guardando..." : "Guardar datos"}
          </button>
        </div>
      </div>
    </section>
  );
}
