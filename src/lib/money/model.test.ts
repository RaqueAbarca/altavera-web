import { describe, expect, it } from "vitest";
import { expense, newDocument, reportForPeriod, splitBudget, summarize, validateDocument, type MoneyRecord } from "./model";
describe("control de dinero", () => {
  it("reparte una sola bolsa y conserva cada céntimo", () => {
    expect(splitBudget(26600, [{ name: "R", percent: 50 }, { name: "A", percent: 50 }]).map(p => p.amount)).toEqual([13300, 13300]);
    expect(splitBudget(100, [{ name: "R", percent: 33.33 }, { name: "A", percent: 33.33 }, { name: "B", percent: 33.34 }]).reduce((n, p) => n + p.amount, 0)).toBe(100);
  });
  it("comprar bolsas no equivale a consumirlas todas", () => {
    const d = newDocument(); d.reviewed = true;
    d.expenses = [{ ...expense("Bolsas", "packaging", "2026-10-17"), amount: 3000, consumed: 600, state: "paid" }];
    expect(summarize(d)).toMatchObject({ cost: 600, cashOut: 3000, pending: 0, missing: [] });
  });
  it("pagar una deuda no vuelve a generar el costo", () => {
    const d = newDocument();
    d.expenses = [{ ...expense("Trabajo", "work", "2026-10-17"), amount: 10000, paidBy: "Axel", state: "pending" }];
    expect(summarize(d)).toMatchObject({ cost: 10000, pending: 10000, owed: { Axel: 10000 } });
    d.expenses[0].state = "paid"; d.expenses[0].paidBy = "Altavera";
    expect(summarize(d)).toMatchObject({ cost: 10000, pending: 0, cashOut: 10000 });
  });
  it("devolver un adelanto cambia caja, no el gasto", () => {
    const d = newDocument();
    d.expenses = [{ ...expense("Gasolina", "fuel", "2026-10-17"), amount: 6000, paidBy: "Raquel", state: "paid" }];
    expect(summarize(d)).toMatchObject({ cost: 6000, pending: 6000, cashOut: 0 });
    d.expenses[0].reimbursed = true;
    expect(summarize(d)).toMatchObject({ cost: 6000, pending: 0, cashOut: 6000 });
  });
  it("reserva y gasto no se descuentan dos veces", () => {
    const d = newDocument();
    d.expenses = [{ ...expense("Jeep", "jeep", "2026-10-17"), amount: 4000, state: "reserve" }];
    expect(summarize(d)).toMatchObject({ cost: 0, reserved: 4000, cashOut: 0 });
    d.expenses[0].state = "paid";
    expect(summarize(d)).toMatchObject({ cost: 4000, reserved: 0, cashOut: 4000 });
  });
  it("distingue cero confirmado de monto desconocido", () => {
    const d = newDocument(); d.reviewed = true;
    d.expenses = [expense("Gasolina", "fuel", "2026-10-17")];
    expect(summarize(d).missing).toContain("Gasolina");
    d.expenses[0].amount = 0; d.expenses[0].state = "paid";
    expect(summarize(d).missing).toEqual([]);
  });
  it("rechaza negativos, NaN, fechas imposibles e IDs repetidos", () => {
    const d = newDocument(); const e = expense("Costo", "general", "2026-10-17");
    d.expenses = [{ ...e, amount: -1 }]; expect(() => validateDocument(d)).toThrow();
    d.expenses = [{ ...e, amount: NaN }]; expect(() => validateDocument(d)).toThrow();
    d.expenses = [{ ...e, date: "2026-02-30" }]; expect(() => validateDocument(d)).toThrow();
    d.expenses = [e, e]; expect(() => validateDocument(d)).toThrow();
  });
  it("consumir material comprado antes tiene costo pero no otra salida de caja", () => {
    const d = newDocument(); d.expenses = [{ ...expense("Bolsas anteriores", "packaging", "2026-10-24"), amount: 0, consumed: 600, state: "paid" }];
    expect(summarize(d)).toMatchObject({ cost: 600, cashOut: 0 });
  });
  it("filtra quincenas sin duplicar ingresos y reconoce una reserva usada otro mes", () => {
    const record: MoneyRecord = { key: "delivery:test", kind: "delivery", date: "2026-10-15", closed: true, revision: 1, payload: { ...newDocument(), source: { fingerprint: "a", revenue: 10000, shipping: 1000, count: 1, products: [] }, expenses: [{ ...expense("Reparación", "jeep", "2026-11-01"), amount: 4000, state: "paid" }] } };
    expect(reportForPeriod([record], "2026-10", "first").map(r => summarize(r.payload).result)).toEqual([10000]);
    expect(reportForPeriod([record], "2026-10", "second")).toEqual([]);
    expect(reportForPeriod([record], "2026-11", "first").map(r => summarize(r.payload).result)).toEqual([-4000]);
  });
  it("no descuenta otra vez una devolución cuyo ingreso ya se excluyó", () => {
    const d = newDocument(); d.expenses = [{ ...expense("Devolución", "refund", "2026-10-17"), amount: 5000, state: "paid", refundAffectsRevenue: false }];
    expect(summarize(d)).toMatchObject({ cost: 0, cashOut: 5000 });
    d.expenses[0].refundAffectsRevenue = true;
    expect(summarize(d).cost).toBe(5000);
  });
  it("avisa cuando se cambió el presupuesto sin crear los pagos", () => {
    const d = newDocument(); d.reviewed = true; d.workBudget = 20000;
    expect(summarize(d).missing).toContain("Crear o actualizar los pagos del reparto de trabajo");
  });
});
