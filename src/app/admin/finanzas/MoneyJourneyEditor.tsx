"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, CircleDollarSign, LockKeyhole, PackageX, Plus, Save, Trash2 } from "lucide-react";

type ProductRow = {
  item_key: string;
  product_name_snapshot: string;
  unit_snapshot: string | null;
  maturity_preference: string | null;
  needed_quantity: number | string;
  opening_stock_quantity: number | string;
  opening_stock_value: number | string;
  purchased_quantity: number | string | null;
  purchase_total: number | string | null;
  used_quantity: number | string | null;
  leftover_quantity: number | string | null;
  loss_quantity: number | string | null;
  cenada_reference_price: number | string | null;
  cenada_reference_date: string | null;
  unavailable: boolean;
};
type ExpenseRow = { concept: string; amount: number | string; notes: string | null };
type SplitRow = { person_name: string; percentage: number | string; paid: boolean };
type RefundCandidate = {
  orderId: string;
  orderItemId: string;
  itemKey: string;
  productName: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  amount: number;
  customerName: string;
  customerPhone: string;
};
type RefundRow = {
  id: string;
  order_id: string;
  order_item_id: string;
  item_key: string;
  product_name_snapshot: string;
  customer_name_snapshot: string;
  customer_phone_snapshot: string | null;
  quantity: number | string;
  unit_snapshot: string | null;
  unit_price_snapshot: number | string;
  amount: number | string;
  paid: boolean;
};
type Material = {
  id: string;
  name: string;
  unit: "g" | "unit";
  remainingQuantity: number;
  remainingValue: number;
  currentUsage: { quantity: number | string; total_cost_snapshot: number | string } | null;
};
type Detail = {
  closure: { id: string; status: "draft" | "review" | "closed"; version: number; notes: string | null; closed_at: string | null; product_revenue_snapshot: number | string | null; shipping_revenue_snapshot: number | string | null; total_revenue_snapshot: number | string | null; refund_total_snapshot: number | string | null };
  source: { deliveryDate: string; totalRevenue: number; productRevenue: number; shippingRevenue: number; orderCount: number; pendingPaymentCount: number; refundCandidates: RefundCandidate[] };
  changedAfterClose: boolean;
  products: ProductRow[];
  expenses: ExpenseRow[];
  labor: { hourly_rate: number | string; purchase_hours: number | string; packing_hours: number | string; delivery_hours: number | string };
  splits: SplitRow[];
  vehicle: { cenada_km: number | string; delivery_km: number | string; fuel_per_km: number | string; maintenance_per_km: number | string; fuel_paid: boolean };
  vehicleAuto: null | { ready: boolean; error: string | null; vehicleName: string | null; cenadaRoadKm: number; cenadaInternalKm: number; cenadaKm: number; deliveryKm: number; totalKm: number; fuelPerKm: number; maintenancePerKm: number; fuelCost: number; maintenanceCost: number; deliveryStops: number; missingLocationCount: number };
  refunds: RefundRow[];
  materials: Material[];
  materialUsages: Array<{ material_id: string; quantity: number | string; total_cost_snapshot: number | string }>;
  totals: { grossRevenue: number; refundTotal: number; refundPending: number; revenue: number; productRecognizedCost: number; productPurchaseCash: number; materialUsageCost: number; otherExpenses: number; labor: number; fuel: number; maintenance: number; profit: number | null; completeProducts: boolean; splitsValid: boolean; nonDeliveredCount: number };
  history: Array<{ id: string; version: number; action: string; changed_at: string }>;
};

type ProductDraft = {
  itemKey: string;
  name: string;
  unit: string | null;
  needed: number;
  openingQuantity: number;
  openingValue: number;
  purchased: string;
  total: string;
  used: string;
  leftover: string;
  loss: string;
  cenada: number | null;
  unavailable: boolean;
};
type ExpenseDraft = { concept: string; amount: string; notes: string };
type LaborDraft = { hourlyRate: string; purchaseHours: string; packingHours: string; deliveryHours: string };
type SplitDraft = { personName: string; percentage: string; paid: boolean; active: boolean };
type VehicleDraft = { cenadaKm: string; deliveryKm: string; fuelPerKm: string; maintenancePerKm: string; fuelPaid: boolean };
type RefundView = { orderItemId: string; itemKey: string; productName: string; customerName: string; customerPhone: string; quantity: number; unit: string | null; amount: number; paid: boolean };

type Props = { cycleId: string; onBack: () => void; onChanged: () => void };
type Step = "products" | "expenses" | "labor" | "vehicle" | "summary";

function money(value: number) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value || 0);
}
function n(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function nullable(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00-06:00`));
}

export default function MoneyJourneyEditor({ cycleId, onBack, onChanged }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [step, setStep] = useState<Step>("products");
  const [products, setProducts] = useState<ProductDraft[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDraft[]>([]);
  const [labor, setLabor] = useState<LaborDraft>({ hourlyRate: "", purchaseHours: "", packingHours: "", deliveryHours: "" });
  const [splits, setSplits] = useState<SplitDraft[]>([
    { personName: "Raquel", percentage: "50", paid: false, active: false },
    { personName: "Axel", percentage: "50", paid: false, active: false },
  ]);
  const [vehicle, setVehicle] = useState<VehicleDraft>({ cenadaKm: "", deliveryKm: "", fuelPerKm: "", maintenancePerKm: "", fuelPaid: false });
  const [materialUsages, setMaterialUsages] = useState<Record<string, string>>({});
  const [refundPaid, setRefundPaid] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function applyDetail(data: Detail) {
    setDetail(data);
    setProducts(data.products.map((row) => ({
      itemKey: row.item_key,
      name: row.product_name_snapshot,
      unit: row.unit_snapshot,
      needed: n(row.needed_quantity),
      openingQuantity: n(row.opening_stock_quantity),
      openingValue: n(row.opening_stock_value),
      purchased: row.purchased_quantity === null ? "" : String(row.purchased_quantity),
      total: row.purchase_total === null ? "" : String(row.purchase_total),
      used: row.used_quantity === null ? String(row.needed_quantity) : String(row.used_quantity),
      leftover: row.leftover_quantity === null ? "0" : String(row.leftover_quantity),
      loss: row.loss_quantity === null ? "0" : String(row.loss_quantity),
      cenada: row.cenada_reference_price === null ? null : n(row.cenada_reference_price),
      unavailable: Boolean(row.unavailable),
    })));
    setExpenses(data.expenses.map((row) => ({ concept: row.concept, amount: String(row.amount), notes: row.notes ?? "" })));
    setLabor({ hourlyRate: String(data.labor.hourly_rate ?? ""), purchaseHours: String(data.labor.purchase_hours ?? ""), packingHours: String(data.labor.packing_hours ?? ""), deliveryHours: String(data.labor.delivery_hours ?? "") });
    const savedSplits = new Map(data.splits.map((row) => [row.person_name.toLowerCase(), row]));
    setSplits(["Raquel", "Axel"].map((personName) => {
      const row = savedSplits.get(personName.toLowerCase());
      return { personName, percentage: row ? String(row.percentage) : "50", paid: row?.paid ?? false, active: Boolean(row) };
    }));
    setVehicle({ cenadaKm: String(data.vehicle.cenada_km ?? ""), deliveryKm: String(data.vehicle.delivery_km ?? ""), fuelPerKm: String(data.vehicle.fuel_per_km ?? ""), maintenancePerKm: String(data.vehicle.maintenance_per_km ?? ""), fuelPaid: Boolean(data.vehicle.fuel_paid) });
    const usageMap: Record<string, string> = {};
    for (const row of data.materialUsages) usageMap[row.material_id] = String(row.quantity);
    setMaterialUsages(usageMap);
    const paidMap: Record<string, boolean> = {};
    for (const row of data.refunds) paidMap[row.order_item_id] = Boolean(row.paid);
    setRefundPaid(paidMap);
    setNotes(data.closure.notes ?? "");
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/finance/closures/${cycleId}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar la jornada");
      applyDetail(data as Detail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la jornada");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [cycleId]);

  const local = useMemo(() => {
    let productCost = 0;
    let purchaseCash = 0;
    let productsComplete = products.length > 0;
    for (const product of products) {
      if (product.unavailable) continue;
      const purchased = nullable(product.purchased);
      const total = nullable(product.total);
      const used = n(product.used);
      const leftover = n(product.leftover);
      const loss = n(product.loss);
      const availableQuantity = product.openingQuantity + (purchased ?? 0);
      const availableValue = product.openingValue + (total ?? 0);
      const complete =
        purchased !== null &&
        purchased >= 0 &&
        total !== null &&
        total >= 0 &&
        availableQuantity > 0;
      const reconciles =
        complete &&
        Math.abs(availableQuantity - used - leftover - loss) <= 0.011;
      if (!complete || !reconciles) productsComplete = false;
      if (complete) {
        const unitCost = availableValue / availableQuantity;
        productCost += (used + loss) * unitCost;
        purchaseCash += total!;
      }
    }
    const expenseTotal = expenses.reduce((sum, row) => sum + n(row.amount), 0);
    const hours = n(labor.purchaseHours) + n(labor.packingHours) + n(labor.deliveryHours);
    const laborTotal = hours * n(labor.hourlyRate);
    const activeSplits = splits.filter((split) => split.active);
    const splitTotal = activeSplits.reduce((sum, split) => sum + n(split.percentage), 0);
    const km = n(vehicle.cenadaKm) + n(vehicle.deliveryKm);
    const fuel = km * n(vehicle.fuelPerKm);
    const maintenance = km * n(vehicle.maintenancePerKm);
    const materialCost = detail?.materials.reduce((sum, material) => {
      const quantity = n(materialUsages[material.id]);
      const availableWithCurrent = material.remainingQuantity + n(material.currentUsage?.quantity);
      const valueWithCurrent = material.remainingValue + n(material.currentUsage?.total_cost_snapshot);
      const unitCost = availableWithCurrent > 0 ? valueWithCurrent / availableWithCurrent : 0;
      return sum + quantity * unitCost;
    }, 0) ?? 0;

    const refunds: RefundView[] = detail?.closure.status === "closed"
      ? detail.refunds.map((refund) => ({
          orderItemId: refund.order_item_id,
          itemKey: refund.item_key,
          productName: refund.product_name_snapshot,
          customerName: refund.customer_name_snapshot,
          customerPhone: refund.customer_phone_snapshot ?? "",
          quantity: n(refund.quantity),
          unit: refund.unit_snapshot,
          amount: n(refund.amount),
          paid: refundPaid[refund.order_item_id] ?? Boolean(refund.paid),
        }))
      : (detail?.source.refundCandidates ?? [])
          .filter((candidate) => products.some((product) => product.itemKey === candidate.itemKey && product.unavailable))
          .map((candidate) => ({
            orderItemId: candidate.orderItemId,
            itemKey: candidate.itemKey,
            productName: candidate.productName,
            customerName: candidate.customerName,
            customerPhone: candidate.customerPhone,
            quantity: candidate.quantity,
            unit: candidate.unit,
            amount: candidate.amount,
            paid: refundPaid[candidate.orderItemId] ?? false,
          }));
    const refundTotal = refunds.reduce((sum, refund) => sum + refund.amount, 0);
    const refundPending = refunds.filter((refund) => !refund.paid).reduce((sum, refund) => sum + refund.amount, 0);
    const grossRevenue = detail?.closure.status === "closed" ? detail.totals.grossRevenue : detail?.source.totalRevenue ?? 0;
    const revenue = grossRevenue - refundTotal;
    const profit = productsComplete ? revenue - productCost - expenseTotal - laborTotal - fuel - maintenance - materialCost : null;
    return { productCost, purchaseCash, productsComplete, expenseTotal, hours, laborTotal, activeSplits, splitTotal, km, fuel, maintenance, materialCost, grossRevenue, revenue, refunds, refundTotal, refundPending, profit };
  }, [products, expenses, labor, splits, vehicle, detail, materialUsages, refundPaid]);

  function updateProduct(index: number, field: "purchased" | "total" | "used" | "leftover" | "loss", value: string) {
    setProducts((current) => current.map((product, i) => {
      if (i !== index) return product;
      const next = { ...product, [field]: value };
      if (field === "purchased") {
        const purchased = nullable(value);
        if (purchased !== null) {
          next.leftover = String(
            Math.max(0, next.openingQuantity + purchased - n(next.used) - n(next.loss))
          );
        }
      }
      if (field === "used" || field === "loss") {
        const purchased = nullable(next.purchased);
        if (purchased !== null) {
          next.leftover = String(
            Math.max(0, next.openingQuantity + purchased - n(next.used) - n(next.loss))
          );
        }
      }
      return next;
    }));
  }



  function toggleUnavailable(index: number) {
    setProducts((current) => current.map((product, i) => {
      if (i !== index) return product;
      if (!product.unavailable) {
        return {
          ...product,
          unavailable: true,
          purchased: "0",
          total: "0",
          used: "0",
          leftover: String(product.openingQuantity),
          loss: "0",
        };
      }
      return {
        ...product,
        unavailable: false,
        purchased: "",
        total: "",
        used: String(product.needed),
        leftover: String(Math.max(0, product.openingQuantity - product.needed)),
        loss: "0",
      };
    }));
    setSaved(false);
  }

  function togglePerson(index: number) {
    setSplits((current) => {
      const next = current.map((split, i) => i === index ? { ...split, active: !split.active } : split);
      const active = next.filter((split) => split.active);
      if (active.length === 1) active[0].percentage = "100";
      if (active.length === 2) {
        active[0].percentage = "50";
        active[1].percentage = "50";
      }
      return [...next];
    });
  }

  async function save(action: "save" | "close" | "reopen" | "refunds") {
    if (!detail) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(`/api/admin/finance/closures/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: detail.closure.version,
          action,
          notes,
          products: products.map((product) => ({ itemKey: product.itemKey, unavailable: product.unavailable, purchasedQuantity: nullable(product.purchased), purchaseTotal: nullable(product.total), usedQuantity: nullable(product.used), leftoverQuantity: nullable(product.leftover), lossQuantity: nullable(product.loss) })),
          expenses: expenses.map((row) => ({ concept: row.concept, amount: n(row.amount), notes: row.notes })),
          labor: { hourlyRate: n(labor.hourlyRate), purchaseHours: n(labor.purchaseHours), packingHours: n(labor.packingHours), deliveryHours: n(labor.deliveryHours) },
          splits: splits.filter((split) => split.active).map((split) => ({ personName: split.personName, percentage: n(split.percentage), paid: split.paid })),
          vehicle: { cenadaKm: n(vehicle.cenadaKm), deliveryKm: n(vehicle.deliveryKm), fuelPerKm: n(vehicle.fuelPerKm), maintenancePerKm: n(vehicle.maintenancePerKm), fuelPaid: vehicle.fuelPaid },
          materialUsages: detail.materials.map((material) => ({ materialId: material.id, quantity: n(materialUsages[material.id]) })),
          refunds: local.refunds.map((refund) => ({ orderItemId: refund.orderItemId, paid: refundPaid[refund.orderItemId] ?? refund.paid })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar");
      applyDetail(data as Detail);
      setSaved(true);
      onChanged();
      if (action === "close") setStep("summary");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="money-panel money-loading">Cargando jornada…</section>;
  if (!detail) return <section className="money-panel"><button className="money-link" onClick={onBack}><ChevronLeft size={16}/> Volver</button><div className="money-error">{error || "No se pudo abrir la jornada."}</div></section>;
  const locked = detail.closure.status === "closed";
  const steps: Array<{ key: Step; label: string }> = [
    { key: "products", label: "1. Productos" },
    { key: "expenses", label: "2. Gastos y materiales" },
    { key: "labor", label: "3. Trabajo" },
    { key: "vehicle", label: "4. Jeep" },
    { key: "summary", label: "5. Resumen" },
  ];

  return <section className="money-journey">
    <div className="money-journey-head">
      <div>
        <button className="money-link" type="button" onClick={onBack}><ChevronLeft size={16}/> Volver a jornadas</button>
        <div className="money-title-row"><h2>{dateLabel(detail.source.deliveryDate)}</h2><span className={`money-status ${locked ? "closed" : "draft"}`}>{locked ? <><LockKeyhole size={14}/> Cerrada</> : "Borrador"}</span></div>
        <p>{detail.source.orderCount} pedidos pagados · {money(locked ? detail.totals.grossRevenue : detail.source.totalRevenue)} cobrados</p>
      </div>
      <div className="money-save-state">{saved ? <><Check size={16}/> Guardado</> : null}</div>
    </div>

    {detail.changedAfterClose ? <div className="money-warning"><AlertTriangle size={18}/><div><strong>Los pedidos cambiaron después del cierre.</strong><span>El cierre histórico no se modificó. Usa “Corregir cierre” para revisar los cambios.</span></div></div> : null}
    {detail.source.pendingPaymentCount > 0 ? <div className="money-info">Hay {detail.source.pendingPaymentCount} pedido(s) con pago pendiente. No se incluyen como ingreso de esta jornada.</div> : null}
    {error ? <div className="money-error">{error}</div> : null}

    <nav className="money-stepper" aria-label="Pasos del cierre">{steps.map((item) => <button type="button" key={item.key} className={step === item.key ? "active" : ""} onClick={() => setStep(item.key)}>{item.label}</button>)}</nav>

    {step === "products" ? <div className="money-panel">
      <div className="money-section-title"><div><h3>Costos reales de los productos</h3><p>Registra lo que compraste. Si un producto no se consiguió, márcalo y Altavera prepara los reembolsos por cliente.</p></div></div>
      <div className="money-product-list">{products.map((product, index) => {
        const purchased = nullable(product.purchased);
        const total = nullable(product.total);
        const availableQuantity = product.openingQuantity + (purchased ?? 0);
        const availableValue = product.openingValue + (total ?? 0);
        const unitCost =
          purchased !== null && total !== null && availableQuantity > 0
            ? availableValue / availableQuantity
            : null;
        const reconciles =
          product.unavailable ||
          (
            purchased !== null &&
            total !== null &&
            Math.abs(
              availableQuantity - n(product.used) - n(product.leftover) - n(product.loss)
            ) <= 0.011
          );
        const productRefunds = local.refunds.filter((refund) => refund.itemKey === product.itemKey);
        const productRefundTotal = productRefunds.reduce((sum, refund) => sum + refund.amount, 0);
        const hasPaidRefund = productRefunds.some((refund) => refundPaid[refund.orderItemId] ?? refund.paid);
        return <article className={`money-product-card ${product.unavailable ? "is-unavailable" : ""}`} key={product.itemKey}>
          <div className="money-product-name">
            <div><strong>{product.name}</strong><span>Necesitamos {product.needed} {product.unit ?? "un."}</span>{product.openingQuantity > 0 ? <span className="money-opening-stock">Sobrante anterior: {product.openingQuantity} {product.unit ?? "un."} · {money(product.openingValue)}</span> : null}</div>
            <div className="money-product-side">
              {product.cenada !== null ? <small>Referencia CENADA: {money(product.cenada)} / {product.unit ?? "unidad"}</small> : <small>Sin referencia CENADA comparable</small>}
              <button type="button" className={`money-unavailable-toggle ${product.unavailable ? "active" : ""}`} disabled={locked || (product.unavailable && hasPaidRefund)} onClick={() => toggleUnavailable(index)}><PackageX size={15}/>{product.unavailable ? "No se consiguió" : "Marcar no conseguido"}</button>
            </div>
          </div>
          {product.unavailable ? <div className="money-unavailable-note"><PackageX size={17}/><div><strong>Este producto no se consiguió.</strong><span>No se carga costo a la jornada y se generan {productRefunds.length} reembolso(s) por {money(productRefundTotal)}. Cualquier sobrante anterior permanece en inventario.</span></div></div> : <>
            <div className="money-fields product-fields">
              <label>Compramos hoy<input disabled={locked} inputMode="decimal" value={product.purchased} onChange={(e) => updateProduct(index, "purchased", e.target.value)} placeholder="0"/><span>{product.unit ?? "un."}</span></label>
              <label>Pagamos hoy<input disabled={locked} inputMode="decimal" value={product.total} onChange={(e) => updateProduct(index, "total", e.target.value)} placeholder="₡0"/></label>
              <label>Costo real<input disabled value={unitCost === null ? "Pendiente" : money(unitCost)}/></label>
              <label>Utilizado<input disabled={locked} inputMode="decimal" value={product.used} onChange={(e) => updateProduct(index, "used", e.target.value)}/></label>
              <label>Sobrante<input disabled={locked} inputMode="decimal" value={product.leftover} onChange={(e) => updateProduct(index, "leftover", e.target.value)}/></label>
              <label>Se dañó<input disabled={locked} inputMode="decimal" value={product.loss} onChange={(e) => updateProduct(index, "loss", e.target.value)}/></label>
            </div>
            {purchased !== null && total !== null && !reconciles ? <div className="money-inline-error">Disponible (sobrante anterior + compra de hoy) debe ser igual a utilizado + sobrante + dañado.</div> : null}
          </>}
        </article>;
      })}</div>
      {local.refunds.length > 0 ? <div className="money-refunds">
        <div className="money-refund-head">
          <div><h4>Reembolsos por productos no conseguidos</h4><p>Altavera usa el precio que pagó cada cliente en su pedido.</p></div>
          <div className="money-refund-total"><span>Total a devolver</span><strong>{money(local.refundTotal)}</strong>{local.refundPending > 0 ? <small>Pendiente: {money(local.refundPending)}</small> : <small>Todos realizados</small>}</div>
        </div>
        <div className="money-refund-list">{local.refunds.map((refund) => <article className="money-refund-row" key={refund.orderItemId}>
          <div className="money-refund-customer"><strong>{refund.customerName}</strong>{refund.customerPhone ? <span>{refund.customerPhone}</span> : <span>Sin teléfono guardado</span>}</div>
          <div className="money-refund-product"><strong>{refund.productName}</strong><span>{refund.quantity} {refund.unit ?? "un."}</span></div>
          <strong className="money-refund-amount">{money(refund.amount)}</strong>
          <label className="money-refund-paid"><input type="checkbox" checked={refundPaid[refund.orderItemId] ?? refund.paid} onChange={(e) => { setRefundPaid((current) => ({ ...current, [refund.orderItemId]: e.target.checked })); setSaved(false); }}/><span>Reembolso realizado</span></label>
        </article>)}</div>
      </div> : null}
    </div> : null}

    {step === "expenses" ? <div className="money-panel">
      <div className="money-section-title"><div><h3>Otros gastos</h3><p>Parqueo, hielo u otro gasto propio de esta jornada.</p></div>{!locked ? <button type="button" className="money-secondary" onClick={() => setExpenses((rows) => [...rows, { concept: "", amount: "", notes: "" }])}><Plus size={16}/> Agregar gasto</button> : null}</div>
      <div className="money-expenses">{expenses.length === 0 ? <p className="money-empty">No hay otros gastos registrados.</p> : expenses.map((row, index) => <div className="money-expense-row" key={index}><input disabled={locked} value={row.concept} onChange={(e) => setExpenses((rows) => rows.map((item, i) => i === index ? { ...item, concept: e.target.value } : item))} placeholder="Ej. Parqueo CENADA"/><input disabled={locked} inputMode="decimal" value={row.amount} onChange={(e) => setExpenses((rows) => rows.map((item, i) => i === index ? { ...item, amount: e.target.value } : item))} placeholder="₡0"/>{!locked ? <button aria-label="Eliminar gasto" type="button" onClick={() => setExpenses((rows) => rows.filter((_, i) => i !== index))}><Trash2 size={16}/></button> : null}</div>)}</div>
      <div className="money-divider"/>
      <div className="money-section-title"><div><h3>Bolsas y materiales utilizados</h3><p>Se cobra a esta jornada solo lo consumido. El sobrante queda guardado para después.</p></div></div>
      {detail.materials.length === 0 ? <p className="money-empty">Todavía no hay materiales. Créelos desde la pestaña “Materiales”.</p> : <div className="money-material-usage-grid">{detail.materials.map((material) => <label key={material.id}><span><strong>{material.name}</strong><small>Disponible: {material.remainingQuantity + n(material.currentUsage?.quantity)} {material.unit === "g" ? "g" : "un."}</small></span><input disabled={locked} inputMode="decimal" value={materialUsages[material.id] ?? ""} onChange={(e) => setMaterialUsages((current) => ({ ...current, [material.id]: e.target.value }))} placeholder="0"/><em>{material.unit === "g" ? "g" : "un."}</em></label>)}</div>}
    </div> : null}

    {step === "labor" ? <div className="money-panel">
      <div className="money-section-title"><div><h3>Pago por el trabajo</h3><p>Las horas generan un solo presupuesto de trabajo. Elegir dos personas no duplica el costo.</p></div></div>
      <div className="money-fields labor-fields"><label>Pago por hora<input disabled={locked} inputMode="decimal" value={labor.hourlyRate} onChange={(e) => setLabor({ ...labor, hourlyRate: e.target.value })} placeholder="₡0"/></label><label>Compra<input disabled={locked} inputMode="decimal" value={labor.purchaseHours} onChange={(e) => setLabor({ ...labor, purchaseHours: e.target.value })} placeholder="0 h"/></label><label>Empaque<input disabled={locked} inputMode="decimal" value={labor.packingHours} onChange={(e) => setLabor({ ...labor, packingHours: e.target.value })} placeholder="0 h"/></label><label>Entregas<input disabled={locked} inputMode="decimal" value={labor.deliveryHours} onChange={(e) => setLabor({ ...labor, deliveryHours: e.target.value })} placeholder="0 h"/></label></div>
      <div className="money-callout"><span>Total de trabajo</span><strong>{local.hours} h · {money(local.laborTotal)}</strong></div>
      <h4>¿Quién participó?</h4><div className="money-splits">{splits.map((split, index) => <article key={split.personName} className={split.active ? "active" : ""}><label className="money-check"><input disabled={locked} type="checkbox" checked={split.active} onChange={() => togglePerson(index)}/><span>{split.personName}</span></label>{split.active ? <><label>Porcentaje<input disabled={locked} inputMode="decimal" value={split.percentage} onChange={(e) => setSplits((rows) => rows.map((row, i) => i === index ? { ...row, percentage: e.target.value } : row))}/><span>%</span></label><strong>{money(local.laborTotal * n(split.percentage) / 100)}</strong><label className="money-paid"><input disabled={locked} type="checkbox" checked={split.paid} onChange={(e) => setSplits((rows) => rows.map((row, i) => i === index ? { ...row, paid: e.target.checked } : row))}/> Ya se pagó</label></> : null}</article>)}</div>
      {local.laborTotal > 0 && Math.abs(local.splitTotal - 100) > 0.01 ? <div className="money-inline-error">El reparto debe sumar 100%. Actualmente suma {local.splitTotal}%.</div> : null}
    </div> : null}

    {step === "vehicle" ? <div className="money-panel">
      <div className="money-section-title"><div><h3>Gasolina y mantenimiento del jeep</h3><p>Altavera calcula automáticamente el viaje a CENADA, la ruta de entregas y el costo del vehículo.</p></div></div>
      {!locked && detail.vehicleAuto && !detail.vehicleAuto.ready ? <div className="money-warning"><AlertTriangle size={18}/><div><strong>No se pudo calcular el recorrido automáticamente.</strong><span>{detail.vehicleAuto.error ?? "Revisa la configuración del jeep y las ubicaciones de los pedidos."}</span></div></div> : null}
      <div className="money-vehicle-auto-grid">
        <article>
          <span>Viaje a CENADA</span>
          <strong>{n(vehicle.cenadaKm).toFixed(1)} km</strong>
          <small>{locked ? "Recorrido guardado al cerrar esta jornada." : detail.vehicleAuto?.ready ? `${detail.vehicleAuto.cenadaRoadKm.toFixed(1)} km por carretera + ${detail.vehicleAuto.cenadaInternalKm.toFixed(1)} km dentro de CENADA` : "Pendiente de cálculo"}</small>
        </article>
        <article>
          <span>Ruta de entregas</span>
          <strong>{n(vehicle.deliveryKm).toFixed(1)} km</strong>
          <small>{locked ? "Recorrido guardado al cerrar esta jornada." : detail.vehicleAuto?.ready ? `${detail.vehicleAuto.deliveryStops} parada(s), inicio y regreso al punto configurado` : "Pendiente de cálculo"}</small>
        </article>
        <article className="total">
          <span>Recorrido total</span>
          <strong>{local.km.toFixed(1)} km</strong>
          <small>CENADA + entregas</small>
        </article>
      </div>
      <div className="money-mini-summary"><div><span>Gasolina</span><strong>{money(local.fuel)}</strong></div><div><span>Reserva mantenimiento</span><strong>{money(local.maintenance)}</strong></div><div><span>Costo total del jeep</span><strong>{money(local.fuel + local.maintenance)}</strong></div></div>
      <p className="money-vehicle-note">{locked ? "Estos valores quedaron guardados con el cierre y no cambian aunque después cambie el precio del combustible o la configuración del vehículo." : detail.vehicleAuto?.ready ? `${detail.vehicleAuto.vehicleName ?? "Vehículo activo"} · gasolina ${money(detail.vehicleAuto.fuelPerKm)}/km · mantenimiento ${money(detail.vehicleAuto.maintenancePerKm)}/km. La ruta se vuelve a calcular al guardar.` : "Completa Configuración → Entregas para poder calcular el jeep automáticamente."}</p>
      <label className="money-check standalone"><input disabled={locked} type="checkbox" checked={vehicle.fuelPaid} onChange={(e) => setVehicle({ ...vehicle, fuelPaid: e.target.checked })}/><span>La gasolina ya fue pagada/reembolsada</span></label>
    </div> : null}

    {step === "summary" ? <div className="money-panel">
      <div className="money-section-title"><div><h3>Resumen de la jornada</h3><p>Resultado del negocio y costos que deben quedar separados.</p></div></div>
      {!local.productsComplete ? <div className="money-warning"><AlertTriangle size={18}/><div><strong>El resultado todavía no es definitivo.</strong><span>Falta un costo real o alguna cantidad de producto no cuadra.</span></div></div> : null}
      <div className="money-summary-columns"><div><h4>Ingresos</h4><p><span>Productos cobrados</span><strong>{money(locked ? n(detail.closure.product_revenue_snapshot) : detail.source.productRevenue)}</strong></p><p><span>Envíos cobrados</span><strong>{money(locked ? n(detail.closure.shipping_revenue_snapshot) : detail.source.shippingRevenue)}</strong></p><p><span>Total cobrado</span><strong>{money(local.grossRevenue)}</strong></p>{local.refundTotal > 0 ? <p className="refund"><span>Reembolsos</span><strong>− {money(local.refundTotal)}</strong></p> : null}<p className="total"><span>Ingreso neto</span><strong>{money(local.revenue)}</strong></p></div><div><h4>Costos de la jornada</h4><p><span>Productos utilizados + pérdida</span><strong>{money(local.productCost)}</strong></p><p><span>Materiales utilizados</span><strong>{money(local.materialCost)}</strong></p><p><span>Otros gastos</span><strong>{money(local.expenseTotal)}</strong></p><p><span>Trabajo</span><strong>{money(local.laborTotal)}</strong></p><p><span>Gasolina</span><strong>{money(local.fuel)}</strong></p><p><span>Reserva mantenimiento</span><strong>{money(local.maintenance)}</strong></p></div></div>
      {local.refundPending > 0 ? <div className="money-warning"><AlertTriangle size={18}/><div><strong>Hay {money(local.refundPending)} pendientes de reembolsar.</strong><span>Ese dinero no se considera disponible para Altavera. Puedes marcar cada reembolso como realizado en Productos.</span></div></div> : null}
      <div className={`money-result ${local.profit === null ? "pending" : local.profit >= 0 ? "positive" : "negative"}`}><span>Resultado de Altavera</span><strong>{local.profit === null ? "Pendiente" : money(local.profit)}</strong><small>{local.profit === null ? "No mostramos una ganancia hasta tener todos los costos reales." : "Este resultado no es lo mismo que el dinero disponible en caja."}</small></div>
      <div className="money-cash-note"><CircleDollarSign size={20}/><div><strong>Salida real por compra de productos: {money(local.purchaseCash)}</strong><span>El resultado usa solo lo utilizado y lo perdido. El valor de sobrantes queda como inventario para otra venta.</span></div></div>
      <label className="money-notes">Nota de la jornada<textarea disabled={locked} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional"/></label>
      {detail.history.length > 0 ? <div className="money-history"><h4>Historial del cierre</h4><div className="money-history-list">{detail.history.map((item) => <span key={item.id}>v{item.version} · {item.action === "closed" ? "Cerrada" : item.action === "reopened" ? "Reabierta" : item.action === "refunds_updated" ? "Reembolsos actualizados" : "Guardada"} · {new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(item.changed_at))}</span>)}</div></div> : null}
      {detail.totals.nonDeliveredCount > 0 ? <div className="money-inline-error">Aún hay {detail.totals.nonDeliveredCount} pedido(s) pagado(s) sin marcar como entregados. No se puede cerrar todavía.</div> : null}
    </div> : null}

    <div className="money-actions">
      {locked ? <>{local.refunds.length > 0 ? <button type="button" className="money-primary" disabled={saving} onClick={() => void save("refunds")}><Save size={16}/>{saving ? "Guardando…" : "Guardar reembolsos"}</button> : null}<button type="button" className="money-secondary" disabled={saving} onClick={() => void save("reopen")}>Corregir cierre</button></> : <><button type="button" className="money-secondary" disabled={saving} onClick={() => void save("save")}><Save size={16}/>{saving ? "Guardando…" : "Guardar avance"}</button><button type="button" className="money-primary" disabled={saving || !local.productsComplete || detail.totals.nonDeliveredCount > 0 || (local.laborTotal > 0 && Math.abs(local.splitTotal - 100) > 0.01) || Boolean(detail.vehicleAuto && !detail.vehicleAuto.ready)} onClick={() => void save("close")}><LockKeyhole size={16}/> Cerrar jornada</button></>}
    </div>
  </section>;
}
