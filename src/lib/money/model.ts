export type PaymentState = "unknown" | "pending" | "paid" | "reserve";
export type Category = "product" | "packaging" | "fuel" | "jeep" | "work" | "general" | "refund";
export type Expense = {
  id: string; name: string; category: Category; amount: number | null;
  state: PaymentState; paidBy: string; reimbursed: boolean;
  consumed: number | null; quantity: number | null; unit: string;
  date: string; note: string; estimated: boolean; refundAffectsRevenue: boolean;
};
export type Source = { fingerprint: string; revenue: number; shipping: number; count: number;
  products: { key: string; name: string; quantity: number; unit: string }[] };
export type MoneyDocument = {
  expenses: Expense[]; reviewed: boolean; notes: string;
  source?: Source; allocations: { name: string; percent: number }[]; workBudget: number | null;
};
export type MoneyRecord = { key: string; date: string; kind: "delivery" | "month";
  revision: number; closed: boolean; payload: MoneyDocument; updated_at?: string };
export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = (n: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 2 }).format(n);
export const todayCR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export function expense(name: string, category: Category, date: string): Expense {
  return { id: crypto.randomUUID(), name, category, date, amount: null, state: "unknown", paidBy: "Altavera", reimbursed: false, consumed: null, quantity: null, unit: "", note: "", estimated: false, refundAffectsRevenue: true };
}
export function newDocument(): MoneyDocument {
  return { expenses: [], reviewed: false, notes: "", workBudget: null, allocations: [{ name: "Raquel", percent: 50 }, { name: "Axel", percent: 50 }] };
}
export function splitBudget(total: number, allocations: MoneyDocument["allocations"]) {
  let assigned = 0;
  return allocations.map((person, index) => {
    const amount = index === allocations.length - 1 ? round(total - assigned) : round(total * person.percent / 100);
    assigned = round(assigned + amount);
    return { name: person.name, amount };
  });
}
export function summarize(doc: MoneyDocument) {
  let cost = 0, pending = 0, reserved = 0, cashOut = 0;
  const owed: Record<string, number> = {};
  const missing: string[] = [];
  for (const e of doc.expenses) {
    if (e.amount === null || e.state === "unknown") missing.push(e.name || "Gasto sin nombre");
    if (e.state === "pending" && e.paidBy === "Altavera" && (e.amount ?? 0) > 0) missing.push(`Indicar quién recibe el pago: ${e.name}`);
    const amount = e.amount ?? 0;
    if (e.state === "reserve") { reserved += amount; continue; }
    const inventory = e.category === "product" || e.category === "packaging";
    if (inventory && e.consumed === null) missing.push(`Costo utilizado: ${e.name}`);
    cost += inventory ? (e.consumed ?? 0) : e.category === "refund" && !e.refundAffectsRevenue ? 0 : amount;
    const reimburse = e.state === "paid" && e.paidBy !== "Altavera" && !e.reimbursed;
    if (e.state === "pending" || reimburse) {
      pending += amount;
      const person = e.paidBy || "Por asignar";
      owed[person] = round((owed[person] ?? 0) + amount);
    }
    if (e.state === "paid" && (e.paidBy === "Altavera" || e.reimbursed)) cashOut += amount;
  }
  if (!doc.reviewed) missing.push("Confirmar que registraste compras, empaque, trabajo y transporte");
  if (doc.workBudget !== null) {
    const allocated = doc.expenses.filter(e => e.id.startsWith("work:"));
    if (!allocated.length || round(allocated.reduce((s, e) => s + (e.amount ?? 0), 0)) !== round(doc.workBudget)) missing.push("Crear o actualizar los pagos del reparto de trabajo");
  }
  return { cost: round(cost), pending: round(pending), reserved: round(reserved), cashOut: round(cashOut), owed,
    result: round((doc.source?.revenue ?? 0) - cost), missing, estimated: doc.expenses.some(e => e.estimated) };
}
export function reportForPeriod(records: MoneyRecord[], month: string, half: string) {
  const matches = (date: string) => date.slice(0, 7) === month && (half === "all" || (half === "first" ? Number(date.slice(8, 10)) <= 15 : Number(date.slice(8, 10)) > 15));
  return records.filter(r => (r.date.slice(0, 7) === month && (r.kind === "month" || matches(r.date))) || r.payload.expenses.some(e => matches(e.date)))
    .map(r => ({ ...r, payload: { ...r.payload, source: r.kind === "delivery" && matches(r.date) ? r.payload.source : undefined, expenses: r.payload.expenses.filter(e => matches(e.date)) } }));
}
export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
// Shared validation is repeated on the server: the browser is not a trust boundary.
export function validateDocument(value: unknown): asserts value is MoneyDocument {
  if (!value || typeof value !== "object") throw new Error("Faltan los datos del cierre.");
  const d = value as MoneyDocument;
  const number = (n: unknown) => n === null || (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1e10);
  const text = (s: unknown, max = 300) => typeof s === "string" && s.length <= max;
  if (!Array.isArray(d.expenses) || d.expenses.length > 1000 || typeof d.reviewed !== "boolean" || !text(d.notes, 4000) || !number(d.workBudget)) throw new Error("Datos del cierre inválidos.");
  if (!Array.isArray(d.allocations) || d.allocations.length > 20 || d.allocations.some(p => !text(p.name, 100) || !p.name.trim() || typeof p.percent !== "number" || !Number.isFinite(p.percent) || p.percent < 0 || p.percent > 100)) throw new Error("Revisá las personas y porcentajes.");
  if (new Set(d.expenses.map(e => e.id)).size !== d.expenses.length) throw new Error("Hay gastos duplicados.");
  for (const e of d.expenses) {
    if (typeof e.refundAffectsRevenue !== "boolean") throw new Error("Revisá el tipo de devolución.");
    if (!text(e.id, 150) || !e.id || !text(e.name) || !e.name.trim() || !text(e.paidBy, 100) || !e.paidBy.trim() || !text(e.note, 2000) || !text(e.unit, 100) || !validDate(e.date) || !number(e.amount) || !number(e.consumed) || !number(e.quantity) || typeof e.reimbursed !== "boolean" || typeof e.estimated !== "boolean" || !["unknown", "paid", "pending", "reserve"].includes(e.state) || !["product", "packaging", "fuel", "jeep", "work", "general", "refund"].includes(e.category)) throw new Error("Revisá los montos, nombres y fechas de cada gasto.");
    if (e.category === "work" && e.state === "reserve") throw new Error("El trabajo acordado debe quedar pendiente o pagado, no como reserva.");
  }
}
