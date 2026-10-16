"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import "../admin.css";
import "./finanzas.css";

type PeriodKey = "7" | "30" | "90" | "all";

type FinanceResponse = {
  error?: string;
  period: {
    key: PeriodKey;
    days: number | null;
  };
  pricingSnapshot: {
    runId: number;
    cycleId: number | null;
    publishedAt: string | null;
    finishedAt: string | null;
    isPublished: boolean;
  } | null;
  summary: {
    paidOrders: number;
    totalSales: number;
    merchandiseRevenue: number;
    shippingRevenue: number;
    averageTicket: number;
    estimatedMerchandiseCost: number;
    estimatedGrossProfit: number;
    weightedSalesMargin: number | null;
    salesCostCoverage: number | null;
    catalogAverageMargin: number | null;
    catalogMedianMargin: number | null;
    activeProducts: number;
    productsWithCost: number;
    catalogCostCoverage: number | null;
    productsBelowStandardMargin: number;
    productsBelowCompetitiveMargin: number;
  };
  categoryBreakdown: Array<{
    category: string;
    revenue: number;
    estimatedGrossProfit: number;
    estimatedMargin: number | null;
    costCoverage: number | null;
    units: number;
  }>;
  cycleBreakdown: Array<{
    cycleId: string;
    deliveryDate: string | null;
    orders: number;
    sales: number;
    productRevenue: number;
    estimatedGrossProfit: number;
    estimatedMargin: number | null;
    costCoverage: number | null;
  }>;
  lowMarginProducts: Array<{
    productId: number;
    name: string;
    category: string;
    unit: string | null;
    price: number;
    effectiveCost: number;
    margin: number | null;
  }>;
  pricingRules: Array<{
    category: string;
    minimumMargin: number | null;
    competitiveMinimumMargin: number | null;
    walmartDiscount: number | null;
  }>;
};

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
  { key: "all", label: "Todo" },
];

function money(value: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number | null) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00-06:00`);
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dateTimeLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function marginClass(value: number | null) {
  if (value === null) return "finance-neutral";
  if (value < 0.2) return "finance-danger";
  if (value < 0.3) return "finance-warning";
  return "finance-good";
}

export default function FinanzasPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [data, setData] = useState<FinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFinance() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/admin/finance?days=${period}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as FinanceResponse;

        if (response.status === 401 || response.status === 403) {
          router.push("/admin");
          return;
        }

        if (!response.ok) {
          throw new Error(result.error ?? "No se pudo cargar el panel financiero");
        }

        if (!cancelled) setData(result);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el panel financiero"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFinance();

    return () => {
      cancelled = true;
    };
  }, [period, router]);

  const periodLabel = useMemo(
    () => PERIODS.find((item) => item.key === period)?.label ?? "30 días",
    [period]
  );

  return (
    <main className="admin-container finance-admin">
      <header className="finance-header">
        <div>
          <button
            type="button"
            className="finance-back"
            onClick={() => router.push("/admin/dashboard")}
          >
            ← Volver al panel
          </button>
          <h1>Finanzas</h1>
          <p>
            Ventas, margen bruto estimado y salud de precios de Altavera.
          </p>
        </div>

        <div className="finance-periods" aria-label="Periodo financiero">
          {PERIODS.map((item) => (
            <button
              type="button"
              key={item.key}
              className={period === item.key ? "active" : ""}
              onClick={() => setPeriod(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {error ? <div className="finance-error">{error}</div> : null}

      {loading ? (
        <section className="finance-loading">Cargando información financiera…</section>
      ) : data ? (
        <>
          <section className="finance-note">
            <strong>Cómo leer este panel.</strong> Las ventas solo incluyen pedidos
            cuyo pago ya fue confirmado. El margen de ventas es una estimación con
            el costo efectivo del último ciclo de precios disponible; por eso todavía
            no debe interpretarse como utilidad neta histórica.
          </section>

          <section className="finance-kpi-grid">
            <article className="finance-kpi finance-kpi-primary">
              <span>Ventas confirmadas · {periodLabel}</span>
              <strong>{money(data.summary.totalSales)}</strong>
              <small>{data.summary.paidOrders} pedidos pagados</small>
            </article>

            <article className="finance-kpi">
              <span>Margen bruto estimado</span>
              <strong className={marginClass(data.summary.weightedSalesMargin)}>
                {percent(data.summary.weightedSalesMargin)}
              </strong>
              <small>Ponderado por lo que realmente se vendió</small>
            </article>

            <article className="finance-kpi">
              <span>Utilidad bruta estimada</span>
              <strong>{money(data.summary.estimatedGrossProfit)}</strong>
              <small>Solo mercancía con costo disponible</small>
            </article>

            <article className="finance-kpi">
              <span>Ticket promedio</span>
              <strong>{money(data.summary.averageTicket)}</strong>
              <small>Promedio por pedido confirmado</small>
            </article>

            <article className="finance-kpi">
              <span>Ingreso por envíos</span>
              <strong>{money(data.summary.shippingRevenue)}</strong>
              <small>No se mezcla con el margen de producto</small>
            </article>

            <article className="finance-kpi">
              <span>Cobertura de costos en ventas</span>
              <strong>{percent(data.summary.salesCostCoverage)}</strong>
              <small>Porción de venta con costo CENADA calculable</small>
            </article>
          </section>

          <section className="finance-section">
            <div className="finance-section-heading">
              <div>
                <h2>Salud del catálogo actual</h2>
                <p>Qué margen dejan hoy los precios publicados contra su costo efectivo.</p>
              </div>
              <div className="finance-pricing-date">
                <span>Base de costos</span>
                <strong>
                  {data.pricingSnapshot
                    ? dateTimeLabel(
                        data.pricingSnapshot.publishedAt ??
                          data.pricingSnapshot.finishedAt
                      )
                    : "Sin ciclo de precios"}
                </strong>
              </div>
            </div>

            <div className="finance-health-grid">
              <article>
                <span>Margen promedio del catálogo</span>
                <strong className={marginClass(data.summary.catalogAverageMargin)}>
                  {percent(data.summary.catalogAverageMargin)}
                </strong>
              </article>
              <article>
                <span>Mediana del catálogo</span>
                <strong className={marginClass(data.summary.catalogMedianMargin)}>
                  {percent(data.summary.catalogMedianMargin)}
                </strong>
              </article>
              <article>
                <span>Productos con costo calculado</span>
                <strong>
                  {data.summary.productsWithCost} / {data.summary.activeProducts}
                </strong>
                <small>{percent(data.summary.catalogCostCoverage)} del catálogo</small>
              </article>
              <article>
                <span>Debajo de 30%</span>
                <strong className="finance-warning">
                  {data.summary.productsBelowStandardMargin}
                </strong>
                <small>Revisar margen normal</small>
              </article>
              <article>
                <span>Debajo de 20%</span>
                <strong className="finance-danger">
                  {data.summary.productsBelowCompetitiveMargin}
                </strong>
                <small>Prioridad alta</small>
              </article>
            </div>
          </section>

          <section className="finance-two-columns">
            <div className="finance-section">
              <div className="finance-section-heading compact">
                <div>
                  <h2>Margen por categoría</h2>
                  <p>Basado en las ventas del periodo seleccionado.</p>
                </div>
              </div>

              <div className="finance-table-wrap">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Ventas</th>
                      <th>Utilidad est.</th>
                      <th>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categoryBreakdown.length ? (
                      data.categoryBreakdown.map((row) => (
                        <tr key={row.category}>
                          <td>{row.category}</td>
                          <td>{money(row.revenue)}</td>
                          <td>{money(row.estimatedGrossProfit)}</td>
                          <td>
                            <span className={marginClass(row.estimatedMargin)}>
                              {percent(row.estimatedMargin)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>Todavía no hay ventas confirmadas en este periodo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="finance-section">
              <div className="finance-section-heading compact">
                <div>
                  <h2>Productos que requieren atención</h2>
                  <p>Los márgenes actuales más bajos del catálogo.</p>
                </div>
              </div>

              <div className="finance-risk-list">
                {data.lowMarginProducts.length ? (
                  data.lowMarginProducts.map((product) => (
                    <article key={product.productId}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>{product.category}</span>
                      </div>
                      <div className="finance-risk-numbers">
                        <span>
                          {money(product.effectiveCost)} → {money(product.price)}
                        </span>
                        <strong className={marginClass(product.margin)}>
                          {percent(product.margin)}
                        </strong>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="finance-empty">No hay costos suficientes para comparar.</p>
                )}
              </div>
            </div>
          </section>

          <section className="finance-section">
            <div className="finance-section-heading compact">
              <div>
                <h2>Resultado por entrega</h2>
                <p>Últimos ciclos dentro del periodo seleccionado.</p>
              </div>
            </div>

            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Entrega</th>
                    <th>Pedidos</th>
                    <th>Ventas</th>
                    <th>Utilidad est.</th>
                    <th>Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cycleBreakdown.length ? (
                    data.cycleBreakdown.map((cycle) => (
                      <tr key={cycle.cycleId}>
                        <td>{dateLabel(cycle.deliveryDate)}</td>
                        <td>{cycle.orders}</td>
                        <td>{money(cycle.sales)}</td>
                        <td>{money(cycle.estimatedGrossProfit)}</td>
                        <td>
                          <span className={marginClass(cycle.estimatedMargin)}>
                            {percent(cycle.estimatedMargin)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>Todavía no hay ciclos con ventas confirmadas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="finance-section">
            <div className="finance-section-heading compact">
              <div>
                <h2>Reglas de margen configuradas</h2>
                <p>Referencia para revisar qué política está usando el motor de precios.</p>
              </div>
            </div>

            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Margen normal mínimo</th>
                    <th>Margen competitivo mínimo</th>
                    <th>Descuento objetivo Walmart</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pricingRules.map((rule) => (
                    <tr key={rule.category}>
                      <td>{rule.category}</td>
                      <td>{percent(rule.minimumMargin)}</td>
                      <td>{percent(rule.competitiveMinimumMargin)}</td>
                      <td>{percent(rule.walmartDiscount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="finance-footnote">
            <strong>Importante:</strong> este panel muestra margen bruto, no utilidad
            neta. Para convertirlo en un estado financiero real todavía faltará registrar
            costos como combustible/reparto, comisiones, gastos fijos y, sobre todo,
            congelar el costo real de cada producto en el momento de cada compra.
          </section>
        </>
      ) : null}
    </main>
  );
}
