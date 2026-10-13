"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bell, Truck, WalletCards } from "lucide-react";
import DeliverySettingsTab from "./DeliverySettingsTab";
import BusinessSettingsTab from "./BusinessSettingsTab";
import AlertsSettingsTab from "./AlertsSettingsTab";
import "../admin.css";
import "./configuracion.css";

type SettingsTab = "delivery" | "business" | "alerts";

export default function AdminConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("delivery");

  return (
    <main className="admin-container admin-settings-page">
      <header className="admin-page-header admin-settings-header">
        <div>
          <Link className="admin-back-link" href="/admin/dashboard">
            <ArrowLeft size={17} />
            Volver al panel
          </Link>
          <h1>Configuración</h1>
          <p>Ajustes operativos de Altavera, organizados por área.</p>
        </div>
      </header>

      <nav className="settings-main-tabs" aria-label="Secciones de configuración">
        <button
          type="button"
          className={`settings-main-tab${activeTab === "delivery" ? " active" : ""}`}
          onClick={() => setActiveTab("delivery")}
        >
          <Truck size={17} />
          Entregas
        </button>
        <button
          type="button"
          className={`settings-main-tab${activeTab === "business" ? " active" : ""}`}
          onClick={() => setActiveTab("business")}
        >
          <WalletCards size={17} />
          Pagos y contacto
        </button>
        <button
          type="button"
          className={`settings-main-tab${activeTab === "alerts" ? " active" : ""}`}
          onClick={() => setActiveTab("alerts")}
        >
          <Bell size={17} />
          Alertas
        </button>
      </nav>

      <div className="settings-tab-content">
        {activeTab === "delivery" && <DeliverySettingsTab />}
        {activeTab === "business" && <BusinessSettingsTab />}
        {activeTab === "alerts" && <AlertsSettingsTab />}
      </div>
    </main>
  );
}
