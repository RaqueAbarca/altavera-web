"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarDays, ChevronRight, CircleDollarSign, Download, PackageOpen, WalletCards } from "lucide-react";
import MaterialsPanel from "./MaterialsPanel";
import MoneyJourneyEditor from "./MoneyJourneyEditor";
import "../admin.css";
import "./finanzas.css";

type Half = "month" | "first" | "second";
type View = "journeys" | "materials" | "reports";
type CycleCard = {
  cycleId: string;
  deliveryDate: string;
  orderCount: number;
  deliveredCount: number;
  currentRevenue: number;
  closure: null | { id: string; status: "draft" | "review" | "closed"; version: number; totalRevenue: number; closedAt: string | null; updatedAt: string };
};
type Overview = {
  setupRequired: boolean;
  period: { month: string; from: string; to: string };
  cycleCards: CycleCard[];
  summary: null | {
    closedJourneys: number;
    productRevenue: number;
    shippingRevenue: number;
    totalRevenue: number;
    refunds: number;
    netRevenue: number;
    productCost: number;
    productPurchaseCash: number;
    materialUsage: number;
    materialPurchases: number;
    otherExpenses: number;
    labor: number;
    fuel: number;
    maintenance: number;
    profit: number;
    availableGenerated: number;
  };
  current: null | {
    calculatedAvailable: number;
    unpaidLabor: number;
    unpaidFuel: number;
    maintenanceReserve: number;
    pendingRefunds: number;
    lockedFutureOrders: number;
  };
  error?: string;
};

function money(value: number) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value || 0);
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00-06:00`));
}
function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? String(new Date().getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(new Date().getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default function MoneyPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("journeys");
  const [month, setMonth] = useState(currentMonth);
  const [half, setHalf] = useState<Half>("month");
  const [data, setData] = useState<Overview | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/finance?month=${encodeURIComponent(month)}&half=${half}`, { cache: "no-store" });
      const result = await response.json() as Overview;
      if (response.status === 401 || response.status === 403) { router.push("/admin"); return; }
      if (!response.ok) throw new Error(result.error ?? "No se pudo cargar el control de dinero");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el control de dinero");
    } finally {
      setLoading(false);
    }
  }, [month, half, router]);

  useEffect(() => { void load(); }, [load]);

  const statusCounts = useMemo(() => {
    const cards = data?.cycleCards ?? [];
    return { closed: cards.filter((card) => card.closure?.status === "closed").length, draft: cards.filter((card) => card.closure && card.closure.status !== "closed").length };
  }, [data]);

  if (selectedCycle) return <main className="admin-container money-admin"><MoneyJourneyEditor cycleId={selectedCycle} onBack={() => { setSelectedCycle(null); void load(); }} onChanged={() => void load()}/></main>;

  return <main className="admin-container money-admin">
    <header className="money-header">
      <div><button className="money-link" type="button" onClick={() => router.push("/admin/dashboard")}><ArrowLeft size={16}/> Volver al panel</button><span className="money-kicker">Administración</span><h1>Dinero</h1><p>Cierra cada jornada y separa lo que ganó Altavera de lo que todavía está comprometido.</p></div>
      <div className="money-header-icon"><WalletCards size={28}/></div>
    </header>

    <nav className="money-main-tabs"><button className={view === "journeys" ? "active" : ""} onClick={() => setView("journeys")}><CalendarDays size={17}/> Jornadas</button><button className={view === "materials" ? "active" : ""} onClick={() => setView("materials")}><PackageOpen size={17}/> Materiales</button><button className={view === "reports" ? "active" : ""} onClick={() => setView("reports")}><CircleDollarSign size={17}/> Reportes</button></nav>

    {error ? <div className="money-error">{error}</div> : null}
    {data?.setupRequired ? <section className="money-panel money-setup"><AlertTriangle size={22}/><div><h2>Falta preparar Supabase</h2><p>Verifica que estén aplicados <code>APLICAR_CONTROL_DINERO_20261016.sql</code> y <code>APLICAR_JEEP_REEMBOLSOS_20261016.sql</code>.</p></div></section> : null}

    {!data?.setupRequired && view === "journeys" ? <>
      <section className="money-current-grid">
        <article className="money-kpi important"><span>Disponible calculado</span><strong>{data?.current ? money(data.current.calculatedAvailable) : "—"}</strong><small>Después de costos, trabajo, materiales y reservas registradas.</small></article>
        <article className="money-kpi"><span>Por pagar trabajo</span><strong>{data?.current ? money(data.current.unpaidLabor) : "—"}</strong><small>Pagos a personas marcados como pendientes.</small></article>
        <article className="money-kpi"><span>Dinero apartado para pedidos</span><strong>{data?.current ? money(data.current.lockedFutureOrders) : "—"}</strong><small>Pedidos pagados que todavía no se han entregado.</small></article>
        <article className="money-kpi"><span>Reserva jeep</span><strong>{data?.current ? money(data.current.maintenanceReserve) : "—"}</strong><small>Mantenimiento acumulado según kilómetros registrados.</small></article>
        <article className="money-kpi"><span>Reembolsos pendientes</span><strong>{data?.current ? money(data.current.pendingRefunds) : "—"}</strong><small>Dinero que todavía debe devolverse a clientes.</small></article>
      </section>
      <div className="money-help-note"><strong>Disponible calculado</strong> usa únicamente lo registrado en Altavera. No sustituye el saldo real de una cuenta bancaria si hubo retiros, aportes o movimientos fuera del sistema.</div>
      <section className="money-panel">
        <div className="money-section-title"><div><h2>Jornadas</h2><p>Abre la fecha de entrega, registra lo que realmente costó y cierra las cuentas cuando termines.</p></div><span className="money-small-stat">{statusCounts.draft} en proceso · {statusCounts.closed} cerradas</span></div>
        {loading ? <div className="money-loading">Cargando jornadas…</div> : (data?.cycleCards ?? []).length === 0 ? <p className="money-empty">Todavía no hay jornadas de entrega.</p> : <div className="money-journey-list">{(data?.cycleCards ?? []).map((card) => {
          const state = card.closure?.status === "closed" ? "Cerrada" : card.closure ? "En proceso" : "Sin iniciar";
          return <button type="button" key={card.cycleId} className="money-journey-card" onClick={() => setSelectedCycle(card.cycleId)}><div className="money-journey-date"><span>{dateLabel(card.deliveryDate)}</span><small>{card.orderCount} pedidos pagados · {card.deliveredCount} entregados</small></div><div className="money-journey-money"><strong>{money(card.closure?.status === "closed" ? card.closure.totalRevenue : card.currentRevenue)}</strong><span className={`money-status ${card.closure?.status === "closed" ? "closed" : "draft"}`}>{state}</span></div><ChevronRight size={18}/></button>;
        })}</div>}
      </section>
    </> : null}

    {!data?.setupRequired && view === "materials" ? <MaterialsPanel/> : null}

    {!data?.setupRequired && view === "reports" ? <div className="money-stack">
      <section className="money-panel report-controls"><div><h2>Reporte por mes o quincena</h2><p>Solo incluye jornadas cerradas, para no presentar ganancias incompletas como definitivas.</p></div><div className="money-report-filters"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)}/><div className="money-half"><button className={half === "month" ? "active" : ""} onClick={() => setHalf("month")}>Mes completo</button><button className={half === "first" ? "active" : ""} onClick={() => setHalf("first")}>1–15</button><button className={half === "second" ? "active" : ""} onClick={() => setHalf("second")}>16–fin</button></div><button type="button" className="money-secondary" onClick={() => { window.location.href = `/api/admin/finance/export?month=${encodeURIComponent(month)}&half=${half}`; }}><Download size={16}/> Abrir en Excel</button></div></section>
      {loading ? <section className="money-panel money-loading">Calculando reporte…</section> : data?.summary ? <>
        <section className="money-report-top"><article><span>Total cobrado</span><strong>{money(data.summary.totalRevenue)}</strong><small>{data.summary.closedJourneys} jornadas cerradas</small></article><article><span>Resultado Altavera</span><strong className={data.summary.profit >= 0 ? "good" : "bad"}>{money(data.summary.profit)}</strong><small>Después de todos los costos registrados.</small></article><article><span>Disponible generado</span><strong>{money(data.summary.availableGenerated)}</strong><small>Flujo del periodo después de salidas y reservas.</small></article></section>
        <section className="money-panel"><div className="money-section-title"><div><h3>Detalle del periodo</h3><p>{data.period.from} a {data.period.to}</p></div></div><div className="money-report-lines"><p><span>Productos cobrados</span><strong>{money(data.summary.productRevenue)}</strong></p><p><span>Envíos cobrados</span><strong>{money(data.summary.shippingRevenue)}</strong></p><p><span>Reembolsos por producto no conseguido</span><strong>− {money(data.summary.refunds)}</strong></p><p><span>Ingreso neto</span><strong>{money(data.summary.netRevenue)}</strong></p><p><span>Costo real de producto utilizado + perdido</span><strong>− {money(data.summary.productCost)}</strong></p><p><span>Materiales utilizados</span><strong>− {money(data.summary.materialUsage)}</strong></p><p><span>Otros gastos</span><strong>− {money(data.summary.otherExpenses)}</strong></p><p><span>Trabajo</span><strong>− {money(data.summary.labor)}</strong></p><p><span>Gasolina</span><strong>− {money(data.summary.fuel)}</strong></p><p><span>Reserva mantenimiento</span><strong>− {money(data.summary.maintenance)}</strong></p><p className="total"><span>Resultado</span><strong>{money(data.summary.profit)}</strong></p></div><div className="money-report-note"><strong>Compras de inventario durante el periodo:</strong> productos {money(data.summary.productPurchaseCash)} · materiales {money(data.summary.materialPurchases)}. Estas salidas afectan el dinero disponible, aunque una parte del inventario todavía conserve valor.</div></section>
      </> : null}
    </div> : null}
  </main>;
}
