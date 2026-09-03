"use client";

import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BadgeDollarSign,
  ChartNoAxesCombined,
  ClipboardList,
  MapPinned,
  PackageOpen,
  Settings,
  Truck,
  type LucideIcon,
} from "lucide-react";
import "../admin.css";
import "./dashboard.css";

type AdminMenuItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const menuItems: AdminMenuItem[] = [
  {
    title: "Pedidos",
    description: "Ver pedidos recibidos, estados y listas de compra.",
    href: "/admin/pedidos",
    icon: ClipboardList,
  },
  {
    title: "Entregas",
    description: "Ver ubicaciones, mapa y estado de cada ruta de entrega.",
    href: "/admin/entregas",
    icon: Truck,
  },
  {
    title: "Precios CENADA",
    description: "Actualizar precios mediante los boletines de CENADA.",
    href: "/admin/precios",
    icon: BadgeDollarSign,
  },
  {
    title: "Productos",
    description: "Administrar productos, categorías e información del catálogo.",
    href: "/admin/productos",
    icon: PackageOpen,
  },
  {
    title: "Finanzas",
    description: "Revisar ventas, márgenes, utilidad estimada y salud de precios.",
    href: "/admin/finanzas",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Cobertura",
    description: "Administrar las zonas de entrega y exclusiones operativas.",
    href: "/admin/cobertura",
    icon: MapPinned,
  },
  {
    title: "Configuración",
    description: "Gestionar los ajustes generales de la plataforma.",
    href: "/admin/configuracion",
    icon: Settings,
  },
];

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <main className="admin-container admin-dashboard-page">
      <header className="admin-dashboard-header">
        <span className="admin-dashboard-kicker">Panel de administración</span>
        <h1>Altavera Admin</h1>
        <p>Seleccione el módulo que desea administrar.</p>
      </header>

      <section className="admin-menu-grid" aria-label="Módulos de administración">
        {menuItems.map(({ title, description, href, icon: Icon }) => (
          <button
            key={href}
            type="button"
            className="admin-menu-card"
            onClick={() => router.push(href)}
          >
            <div className="admin-menu-card-header">
              <div className="admin-menu-title-row">
                <span className="admin-menu-icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <h2>{title}</h2>
              </div>

              <ArrowUpRight
                className="admin-menu-arrow"
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>

            <p className="admin-menu-description">{description}</p>
          </button>
        ))}
      </section>
    </main>
  );
}
