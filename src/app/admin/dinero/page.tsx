"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { expense, money, newDocument, reportForPeriod, round, splitBudget, summarize, todayCR, type Category, type Expense, type MoneyRecord, type Source } from "@/lib/money/model";
import "./money.css";

type Cycle = { id: string; delivery_date: string };
type Tab = "deliveries" | "payments" | "month";
const categoryLabels: Record<Category, string> = { product: "Productos", packaging: "Bolsas y materiales", fuel: "Gasolina", jeep: "Jeep / mantenimiento", work: "Pago por trabajo", general: "Otro gasto", refund: "Devolución al cliente" };
const states = { unknown: "Por definir", pending: "Pendiente de pagar", paid: "Ya pagado", reserve: "Apartar dinero" };
async function api(path = "", options?: RequestInit) {
  const response = await fetch(`/api/admin/money${path}`, { cache: "no-store", ...options });
  if (response.status === 401 || response.status === 403) { window.location.assign("/admin"); throw new Error("Iniciá sesión como administrador."); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "No se pudo guardar.");
  return data;
}
function NumberField({ label, value, onChange, help }: { label: string; value: number | null; onChange: (n: number | null) => void; help?: string }) {
  return <label>{label}<input type="number" min="0" step="0.01" inputMode="decimal" value={value ?? ""} onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))} />{help && <small>{help}</small>}</label>;
}
function ExpenseCard({ item: e, onChange, onDelete, locked }: { item: Expense; onChange: (patch: Partial<Expense>) => void; onDelete: () => void; locked: boolean }) {
  const inventory = e.category === "product" || e.category === "packaging";
  return <fieldset className="money-expense" disabled={locked}>
    <legend>{categoryLabels[e.category]} · {e.name || "Nuevo gasto"}</legend>
    <div className="money-fields">
      <label>Concepto<input value={e.name} onChange={v => onChange({ name: v.target.value })} maxLength={300} /></label>
      {<label>Fecha del costo o reserva<input type="date" value={e.date} onChange={v => onChange({ date: v.target.value })} /></label>}
      <NumberField label={inventory ? "Total de esta compra (₡)" : "Monto (₡)"} value={e.amount} onChange={amount => onChange({ amount, ...(inventory && (e.consumed === null || e.consumed === e.amount) ? { consumed: amount } : {}) })} help={inventory ? "Monto completo. Abajo podés ajustar cuánto se utilizó." : "Dejalo vacío si todavía no lo sabés. Cero significa que no hubo costo."} />
      <label>¿Cómo se maneja este dinero?<select value={e.state} onChange={v => onChange({ state: v.target.value as Expense["state"], ...(v.target.value === "paid" ? { paidBy: "Altavera", reimbursed: false } : {}), ...(e.state === "reserve" && v.target.value !== "reserve" ? { date: todayCR() } : {}) })}>{Object.entries(states).filter(([key]) => !(e.category === "work" && key === "reserve")).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      {e.state !== "reserve" && <label>{e.state === "paid" ? "¿Quién puso el dinero?" : "¿A quién se le debe pagar?"}<input list="money-people" value={e.paidBy} onChange={v => onChange({ paidBy: v.target.value, reimbursed: false })} /><small>{e.state === "paid" ? "Altavera si salió del negocio. Tu nombre si usaste tu dinero." : "Nombre de la persona o proveedor que recibirá el pago."}</small></label>}
    </div>
    {e.category === "refund" && <label className="money-check"><input type="checkbox" checked={e.refundAffectsRevenue} onChange={v => onChange({ refundAffectsRevenue: v.target.checked })} />El cobro original todavía está incluido en los ingresos de este cierre. Desmarcá si ya se excluyó al cancelar o mover el pedido, para no restarlo dos veces.</label>}
    {e.state === "paid" && e.paidBy !== "Altavera" && <label className="money-check"><input type="checkbox" checked={e.reimbursed} onChange={v => onChange({ reimbursed: v.target.checked })} />Altavera ya le devolvió este dinero a {e.paidBy || "esta persona"}.</label>}
    {e.state === "reserve" && <p className="money-hint">Este monto queda apartado; todavía no es un gasto. La fecha indica cuándo se generó el costo, no cuándo pagaste una deuda. Al usarlo, cambiá este registro a “Ya pagado” y revisá la fecha del costo. Si usás solo una parte, dejá el resto en otro registro como reserva.</p>}
    {inventory && e.state !== "reserve" && <details open={e.consumed === null}>
      <summary>¿Quedó producto o material para otra entrega?</summary>
      <p>Por defecto se cuenta toda la compra como utilizada. Ajustá el costo si quedó algo. Lo que se dañó también cuenta como costo. No vuelvas a registrar la compra al usar un sobrante.</p>
      <div className="money-fields">
        <NumberField label={`Cantidad comprada (${e.unit || "unidades o gramos"})`} value={e.quantity} onChange={quantity => onChange({ quantity })} />
        <label>Unidad<input value={e.unit} onChange={v => onChange({ unit: v.target.value })} placeholder="kg, unidad, gramos…" /></label>
        <NumberField label="Costo de lo utilizado o perdido (₡)" value={e.consumed} onChange={consumed => onChange({ consumed })} help="Incluye sobrantes anteriores utilizados hoy. La compra de hoy puede ser cero." />
        {e.quantity !== null && e.quantity > 0 && e.amount !== null && e.amount > 0 && <NumberField label="Calculadora: cantidad utilizada de esta compra" value={e.consumed === null ? null : round(e.consumed * e.quantity / e.amount)} onChange={n => onChange({ consumed: n === null ? null : round(n * e.amount! / e.quantity!) })} help="Ejemplo: compra de 1.000 g por ₡3.000; usar 200 g equivale a ₡600." />}
      </div>
      <button type="button" onClick={() => onChange({ consumed: e.amount })}>Se utilizó toda esta compra</button>
      <small>Material comprado hoy no consumido: {money(Math.max(0, (e.amount ?? 0) - (e.consumed ?? 0)))}. Este cálculo no reemplaza un inventario acumulado.</small>
    </details>}
    <details><summary>Nota, comprobante y estimación</summary><label>Referencia de factura o nota<textarea value={e.note} maxLength={2000} onChange={v => onChange({ note: v.target.value })} placeholder="Número de factura, proveedor o ubicación del comprobante" /></label><label className="money-check"><input type="checkbox" checked={e.estimated} onChange={v => onChange({ estimated: v.target.checked })} />Este monto todavía es estimado.</label></details>
    {!e.id.startsWith("product:") && <button type="button" className="money-delete" onClick={onDelete}>Quitar este registro</button>}
  </fieldset>;
}
export default function MoneyPage() {
  const [records, setRecords] = useState<MoneyRecord[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [tab, setTab] = useState<Tab>("deliveries");
  const [cycleId, setCycleId] = useState("");
  const [month, setMonth] = useState(todayCR().slice(0, 7));
  const [half, setHalf] = useState("all");
  const [record, setRecord] = useState<MoneyRecord | null>(null);
  const [live, setLive] = useState<Source | null>(null);
  const [busy, setBusy] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<{ revision: number; created_at: string; snapshot: MoneyRecord }[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<number | null>(null);
  const [buffer, setBuffer] = useState<number | null>(null);
  const [futurePay, setFuturePay] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState<Category>("general");
  const sequence = useRef(0);
  async function openDocument(nextTab: Tab, id: string, selectedMonth: string, saved: MoneyRecord[]) {
    const seq = ++sequence.current;
    setBusy(true); setError(""); setMessage(""); setHistory([]); setRecord(null); setLive(null); setDirty(false);
    try {
      if (nextTab === "payments") return;
      if (nextTab === "month") {
        const found = saved.find(r => r.key === `month:${selectedMonth}`);
        setRecord(found ?? { key: `month:${selectedMonth}`, kind: "month", date: `${selectedMonth}-01`, revision: 0, closed: false, payload: newDocument() });
        return;
      }
      if (!id) return;
      const { source }: { source: Source } = await api(`?cycle=${encodeURIComponent(id)}`);
      if (seq !== sequence.current) return;
      setLive(source);
      const date = cycles.find(c => c.id === id)?.delivery_date ?? saved.find(r => r.key === `delivery:${id}`)?.date;
      // A fresh cycle list is installed before the selection can be edited.
      if (!date) throw new Error("Seleccioná una entrega para continuar.");
      const found = saved.find(r => r.key === `delivery:${id}`);
      const r: MoneyRecord = found ? structuredClone(found) : { key: `delivery:${id}`, kind: "delivery", date, revision: 0, closed: false, payload: newDocument() };
      if (!r.closed) {
        r.payload.source = source;
        for (const p of source.products) if (!r.payload.expenses.some(e => e.id === `product:${p.key}`)) r.payload.expenses.push({ ...expense(p.name, "product", date), id: `product:${p.key}`, unit: p.unit });
        if (!found) r.payload.expenses.push(expense("Bolsas utilizadas", "packaging", date), expense("Gasolina de la jornada", "fuel", date), expense("Mantenimiento del jeep", "jeep", date));
      }
      setRecord(r);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar."); }
    finally { if (seq === sequence.current) setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    api().then(data => { if (active) { setRecords(data.records); setCycles(data.cycles); setBusy(false); } }).catch(e => { if (active) { setError(e.message); setBusy(false); } });
    return () => { active = false; sequence.current++; };
  }, []);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function navigate(nextTab: Tab, id = cycleId, selectedMonth = month) {
    if (dirty && !window.confirm("Tenés cambios sin guardar. ¿Querés salir y descartarlos?")) return;
    setTab(nextTab); setCycleId(id); setMonth(selectedMonth);
    void openDocument(nextTab, id, selectedMonth, records);
  }
  async function reload() {
    if (dirty && !window.confirm("Se cargarán los datos guardados. ¿Descartar los cambios locales sin guardar?")) return;
    setBusy(true); setError("");
    try {
      const data = await api(); setRecords(data.records); setCycles(data.cycles);
      await openDocument(tab, cycleId, month, data.records);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo recargar."); setBusy(false); }
  }
  function patchDoc(patch: Partial<MoneyRecord["payload"]>) { if (record) { setRecord({ ...record, payload: { ...record.payload, ...patch } }); setDirty(true); setMessage(""); } }
  function editExpense(id: string, patch: Partial<Expense>) { if (record) patchDoc({ expenses: record.payload.expenses.map(e => e.id === id ? { ...e, ...patch } : e) }); }
  async function save(action: "save" | "close" | "reopen") {
    if (!record) return;
    if (action === "reopen" && !window.confirm("¿Reabrir para corregir? Se conservará la versión anterior en el historial.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await api("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record, action }) });
      setRecords(previous => [...previous.filter(r => r.key !== data.record.key), data.record]); setRecord(data.record); setDirty(false);
      setMessage(action === "close" ? "Cierre guardado. Los importes quedaron congelados." : action === "reopen" ? "Reabierto. Recargá los pedidos antes de guardar si cambiaron." : "Borrador guardado.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  function distribute() {
    if (!record) return;
    const d = record.payload;
    if (d.workBudget === null || d.workBudget < 0 || !d.allocations.length || d.allocations.some(p => !p.name.trim() || p.name.trim() === "Altavera") || round(d.allocations.reduce((s, p) => s + p.percent, 0)) !== 100) { setError("Definí el monto y personas con porcentajes que sumen 100%. Usá sus nombres, no Altavera."); return; }
    if (d.expenses.some(e => e.id.startsWith("work:")) && !window.confirm("Se reemplazará el reparto anterior y sus estados de pago. ¿Continuar?")) return;
    const entries = splitBudget(d.workBudget, d.allocations).map((p, i) => ({ ...expense(`Trabajo de ${p.name}`, "work", record.date), id: `work:${i}`, amount: p.amount, paidBy: p.name, state: "pending" as const }));
    patchDoc({ expenses: [...d.expenses.filter(e => !e.id.startsWith("work:")), ...entries] }); setError("");
  }
  const summary = record ? summarize(record.payload) : null;
  const stale = !!(record?.closed && live && record.payload.source?.fingerprint !== live.fingerprint);
  const pendingRows = records.flatMap(r => r.payload.expenses.filter(e => e.state === "pending" || (e.state === "paid" && e.paidBy !== "Altavera" && !e.reimbursed)).map(e => ({ r, e })));
  const pending = round(records.reduce((s, r) => s + summarize(r.payload).pending, 0));
  const reserves = round(records.reduce((s, r) => s + summarize(r.payload).reserved, 0));
  const unresolved = records.some(r => summarize(r.payload).missing.length > 0 || summarize(r.payload).estimated);
  const inHalf = (date: string) => half === "all" || (half === "first" ? Number(date.slice(8, 10)) <= 15 : Number(date.slice(8, 10)) > 15);
  const inPeriod = (date: string) => date.slice(0, 7) === month && inHalf(date);
  const monthRecords = records.filter(r => (r.date.slice(0, 7) === month && (r.kind === "month" || inHalf(r.date))) || r.payload.expenses.some(e => inPeriod(e.date)));
  const reportRecords = reportForPeriod(records, month, half);
  const monthResult = round(reportRecords.reduce((s, r) => s + summarize(r.payload).result, 0));
  const unreviewed = cycles.filter(c => c.delivery_date.slice(0, 7) === month && inHalf(c.delivery_date) && !records.some(r => r.key === `delivery:${c.id}`)).length;
  const incomplete = unreviewed > 0 || !monthRecords.some(r => r.key === `month:${month}` && r.closed) || monthRecords.some(r => !r.closed);
  function exportCSV() {
    const rows = [["Período", "Estado", "Concepto", "Categoría", "Monto compra/gasto", "Costo utilizado", "Pago", "Persona", "Reembolsado", "Nota"]];
    for (const r of reportRecords) {
      if (r.payload.source) rows.push([r.date, r.closed ? "Cerrado" : "Borrador", "Ingresos confirmados (incluye envío)", "Ingreso", String(r.payload.source?.revenue ?? 0), "", "", "", "", ""]);
      for (const e of r.payload.expenses) rows.push([e.date, r.closed ? "Cerrado" : "Borrador", e.name, categoryLabels[e.category], String(e.amount ?? ""), String(e.consumed ?? ""), states[e.state], e.paidBy, e.reimbursed ? "Sí" : "No", e.note]);
    }
    const safe = (s: string) => `"${(/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""')}"`;
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(r => r.map(safe).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `altavera-dinero-${month}-${half}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <main className="money-page">
    <header className="money-heading"><div><Link href="/admin/dashboard">← Panel</Link><p className="money-eyebrow">ALTAVERA · CONTROL INTERNO</p><h1>Dinero</h1><p>Revisá lo que costó cada entrega, a quién pagar y cuánto queda.</p></div><Link href="/admin/finanzas">Ver márgenes estimados del catálogo →</Link></header>
    <button disabled={busy} onClick={reload}>Actualizar datos guardados</button>
    <nav className="money-tabs" aria-label="Control de dinero">{([["deliveries", "Entregas"], ["payments", "Pagos y reservas"], ["month", "Resumen mensual"]] as const).map(([key, label]) => <button disabled={busy} key={key} aria-pressed={tab === key} onClick={() => navigate(key)}>{label}</button>)}</nav>
    <datalist id="money-people"><option value="Altavera" /><option value="Raquel" /><option value="Axel" /></datalist>
    {error && <div className="money-alert" role="alert">{error} <button disabled={busy} onClick={reload}>Recargar</button></div>}
    {message && <div className="money-success" role="status">{message}</div>}
    {busy && <p role="status">Cargando o guardando…</p>}
    {tab === "deliveries" && <section className="money-panel"><label>¿Qué entrega querés revisar?<select disabled={busy} value={cycleId} onChange={e => navigate("deliveries", e.target.value)}><option value="">Elegí una fecha</option>{cycles.map(c => <option key={c.id} value={c.id}>{c.delivery_date} · {records.find(r => r.key === `delivery:${c.id}`)?.closed ? "Cerrada" : records.some(r => r.key === `delivery:${c.id}`) ? "Borrador" : "Sin revisar"}</option>)}</select></label><p>Se incluyen pedidos con pago confirmado, igual que en Pedidos. Los pedidos sin fecha asignada deben corregirse desde Pedidos. No se usa el precio estimado de CENADA como costo real.</p></section>}
    {tab === "month" && <>
      <section className="money-panel money-fields"><label>Mes<input type="month" value={month} disabled={busy} onChange={e => { if (e.target.value) navigate("month", cycleId, e.target.value); }} /></label><label>Período del reporte<select value={half} onChange={e => setHalf(e.target.value)}><option value="all">Mes completo</option><option value="first">Primera quincena (1 al 15)</option><option value="second">Segunda quincena (16 al último día)</option></select></label><button onClick={exportCSV}>Exportar CSV para Excel</button></section>
      <section className="money-panel"><h2>Resultado del período</h2><p>Por fecha de entrega; los gastos generales usan su propia fecha. Se toman los registros guardados, no los cambios sin guardar. Incluye costos de trabajo registrados; no es una declaración contable o tributaria.</p><strong className="money-total">{money(monthResult)}</strong><p>{incomplete ? `Provisional: hay entregas o gastos generales sin cerrar. ${unreviewed} fechas sin revisar (pueden no tener pedidos).` : "Todos los registros del período están cerrados. Revisá si los pedidos cambiaron después del cierre."}</p><p>Las reservas se muestran aparte: no son gastos realizados.</p><NumberField label="Simulación: pago mensual futuro de redes y administración (₡)" value={futurePay} onChange={setFuturePay} help="No crea pagos ni deudas. Usá mes completo para evaluar un pago mensual." />{futurePay !== null && half === "all" && <p>Resultado con ese pago adicional: <strong>{money(monthResult - futurePay)}</strong></p>}
      <div className="money-table"><table><thead><tr><th>Registro</th><th>Estado</th><th>Ingresos</th><th>Costos</th><th>Resultado</th></tr></thead><tbody>{reportRecords.map(r => <tr key={r.key}><td>{r.kind === "month" ? "Gastos generales" : r.date}</td><td>{r.closed ? "Cerrado" : "Borrador"}</td><td>{money(r.payload.source?.revenue ?? 0)}</td><td>{money(summarize(r.payload).cost)}</td><td>{money(summarize(r.payload).result)}</td></tr>)}</tbody></table></div></section>
    </>}
    {tab === "payments" && <>
      <section className="money-cards"><article><span>Pagos y reembolsos pendientes</span><strong>{money(pending)}</strong></article><article><span>Dinero apartado</span><strong>{money(reserves)}</strong></article></section>
      <section className="money-panel"><h2>¿A quién tengo que pagar?</h2><p>Incluye todos los períodos guardados. Un pago pendiente ya cuenta como costo; pagarlo no vuelve a descontar la ganancia.</p>{pendingRows.length === 0 && <p>No hay pagos pendientes registrados.</p>}{pendingRows.map(({ r, e }) => <div className="money-payment" key={`${r.key}:${e.id}`}><div><strong>{e.paidBy} · {money(e.amount ?? 0)}</strong><p>{e.name} · {r.date} · {e.state === "paid" ? "Devolver dinero adelantado" : "Pago pendiente"}</p></div><button onClick={() => navigate(r.kind === "month" ? "month" : "deliveries", r.kind === "delivery" ? r.key.slice(9) : cycleId, r.date.slice(0, 7))}>Revisar y registrar pago</button></div>)}</section>
      <section className="money-panel"><h2>Reservas del negocio</h2><p>Al pagar, editá el registro original: cambiá “Apartar dinero” a “Ya pagado”. No agregues otra vez el mismo gasto.</p>{records.flatMap(r => r.payload.expenses.filter(e => e.state === "reserve").map(e => <div className="money-payment" key={`${r.key}:${e.id}`}><span>{e.name} · {r.date} · <strong>{money(e.amount ?? 0)}</strong></span><button onClick={() => navigate(r.kind === "month" ? "month" : "deliveries", r.kind === "delivery" ? r.key.slice(9) : cycleId, r.date.slice(0, 7))}>Revisar reserva</button></div>))}</section>
      <section className="money-panel"><h2>¿Cuánto puedo usar hoy?</h2><p>Calculadora, no saldo bancario automático. Consultá el banco y sumá el efectivo. Estos tres datos no se guardan; volvé a confirmarlos cada vez.</p><div className="money-fields"><NumberField label="Dinero actual en banco y efectivo (₡)" value={balance} onChange={setBalance} /><NumberField label="Separar para próximos pedidos y obligaciones no registradas (₡)" value={upcoming} onChange={setUpcoming} help="Incluí pedidos cobrados aún no entregados, impuestos y compromisos que no estén en la lista. No repitas los pagos pendientes de arriba." /><NumberField label="Colchón para seguir operando (₡)" value={buffer} onChange={setBuffer} help="Dinero que querés conservar para compras e imprevistos." /></div>{balance !== null && upcoming !== null && buffer !== null ? <><strong className="money-total">{money(balance - pending - reserves - upcoming - buffer)}</strong><p>Estimación después de pagos pendientes, reservas y montos que acabás de separar. Un número negativo indica faltante.</p></> : <p>Completá los tres montos para calcular. Podés escribir 0 cuando no corresponda.</p>}{unresolved && <p className="money-alert">Hay datos pendientes o estimados. Este monto puede estar sobreestimado.</p>}<p>Antes de retirar dinero, revisá que no falten compras o entregas por registrar. Este módulo no importa los movimientos del banco.</p></section>
    </>}
    {record && tab !== "payments" && <>
      <section className="money-panel"><div className="money-section-heading"><div><h2>{record.kind === "month" ? "Gastos generales del mes" : "Cuentas de esta entrega"}</h2><p>{record.closed ? "Cerrado: reabrí para corregir o actualizar un pago." : "Borrador: completá los campos y guardá tu avance."}{dirty ? " · Hay cambios sin guardar." : ""}</p></div><span className="money-badge">Versión {record.revision}</span></div>
        {record.kind === "month" && <p>Registrá aquí página, publicidad, administración y redes cuando sean gastos acordados. No repitas gastos de las entregas. El editor muestra los registros creados en este mes. El reporte usa la fecha del costo; al pagar una deuda conservá su fecha original.</p>}
        {stale && <p className="money-alert">Los pedidos cambiaron después del cierre. El resultado guardado no se actualizó. Reabrí y recargá para revisar la diferencia.</p>}
        {record.payload.source && <div className="money-cards"><article><span>Pedidos pagados</span><strong>{record.payload.source.count}</strong></article><article><span>Cobrado, con envíos</span><strong>{money(record.payload.source.revenue)}</strong><small>Envíos: {money(record.payload.source.shipping)}</small></article></div>}
        {record.kind === "delivery" && !record.closed && <details><summary>Ver cantidades pedidas como referencia</summary>{record.payload.source?.products.map(p => <p key={p.key}>{p.name}: {p.quantity} {p.unit}</p>)}<p>Las cantidades compradas se ingresan por separado. Si un producto desapareció de los pedidos, su compra guardada se conserva para que registres el costo o sobrante.</p></details>}
      </section>
      <fieldset className="money-panel" disabled={record.closed || busy}><legend>Pago acordado por trabajo</legend><p>Definí una sola bolsa de pago y cómo repartirla. Dos personas no duplican el monto. Esto es un reparto interno; no calcula planilla, cargas sociales ni valida salarios mínimos.</p><NumberField label="Total a repartir (₡)" value={record.payload.workBudget} onChange={workBudget => patchDoc({ workBudget })} />{record.payload.allocations.map((p, i) => <div className="money-fields" key={i}><label>Persona<input value={p.name} maxLength={100} onChange={e => patchDoc({ allocations: record.payload.allocations.map((a, n) => n === i ? { ...a, name: e.target.value } : a) })} /></label><NumberField label="Porcentaje del pago" value={p.percent} onChange={percent => patchDoc({ allocations: record.payload.allocations.map((a, n) => n === i ? { ...a, percent: percent ?? 0 } : a) })} /><button onClick={() => patchDoc({ allocations: record.payload.allocations.filter((_, n) => n !== i) })}>Quitar persona</button></div>)}<div className="money-actions"><button onClick={() => patchDoc({ allocations: [...record.payload.allocations, { name: "", percent: 0 }] })}>Agregar persona</button><button onClick={distribute}>Crear pagos con este reparto</button></div><p>Si trabajó una persona, dejala con 100%. Con dos, podés usar 50% y 50%. Después marcá cada pago cuando se realice.</p></fieldset>
      {record.payload.expenses.map(e => <ExpenseCard key={e.id} item={e} locked={record.closed || busy} onChange={p => editExpense(e.id, p)} onDelete={() => { if (window.confirm("¿Quitar este registro del borrador?")) patchDoc({ expenses: record.payload.expenses.filter(x => x.id !== e.id) }); }} />)}
      <fieldset className="money-panel" disabled={record.closed || busy}><legend>Agregar un gasto o una reserva</legend><div className="money-fields"><label>Tipo<select value={newCategory} onChange={e => setNewCategory(e.target.value as Category)}>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button onClick={() => patchDoc({ expenses: [...record.payload.expenses, expense(categoryLabels[newCategory], newCategory, record.date)] })}>Agregar registro</button></div><label>Notas de este cierre<textarea value={record.payload.notes} maxLength={4000} onChange={e => patchDoc({ notes: e.target.value })} /></label><label className="money-check"><input type="checkbox" checked={record.payload.reviewed} onChange={e => patchDoc({ reviewed: e.target.checked })} />Revisé compras, sobrantes, empaque, trabajo, transporte, devoluciones y otros gastos. No falta registrar ninguno que corresponda.</label></fieldset>
      {summary && <section className="money-panel"><h2>Antes de guardar</h2><div className="money-cards"><article><span>Resultado {record.kind === "delivery" ? "de la entrega" : "de gastos generales"}</span><strong>{money(summary.result)}</strong><small>{record.kind === "delivery" ? "Antes de gastos generales e impuestos no registrados." : "Se descuenta del resultado mensual."}</small></article><article><span>Pendiente de pagar o devolver</span><strong>{money(summary.pending)}</strong></article><article><span>Apartado, todavía sin gastar</span><strong>{money(summary.reserved)}</strong></article></div>{Object.entries(summary.owed).map(([name, amount]) => <p key={name}><strong>{name}:</strong> {money(amount)} por pagar o devolver.</p>)}{(summary.missing.length > 0 || summary.estimated) && <div className="money-alert"><strong>Resultado provisional.</strong><ul>{summary.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>{summary.estimated && <p>Hay montos estimados. Confirmalos antes de cerrar.</p>}</div>}<p>Guardar o cerrar no hace transferencias de dinero. Los costos pendientes cuentan una sola vez, aunque se paguen después.</p></section>}
      <div className="money-savebar">{record.closed ? <button disabled={busy} onClick={() => save("reopen")}>Reabrir para corregir o pagar</button> : <><button disabled={busy} onClick={() => save("save")}>Guardar borrador</button><button className="money-primary" disabled={busy || !!summary?.missing.length || !!summary?.estimated} onClick={() => save("close")}>Cerrar y guardar resultado</button></>}<button disabled={busy || !record.revision} onClick={async () => { try { const data = await api(`?history=${encodeURIComponent(record.key)}`); setHistory(data.history); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el historial."); } }}>Ver historial</button></div>
      {history.length > 0 && <section className="money-panel"><h2>Últimas versiones guardadas</h2>{history.map(h => <details key={h.revision}><summary>Versión {h.revision} · {new Date(h.created_at).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" })} · {h.snapshot.closed ? "Cerrado" : "Borrador"}</summary><p>Resultado: {money(summarize(h.snapshot.payload).result)}</p>{h.snapshot.payload.expenses.map(e => <p key={e.id}>{e.name}: {money(e.amount ?? 0)} · {states[e.state]} · {e.paidBy}</p>)}</details>)}</section>}
    </>}
  </main>;
}
