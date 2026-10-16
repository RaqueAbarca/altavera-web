"use client";

import { useEffect, useState } from "react";
import { PackagePlus, Plus } from "lucide-react";

type Material = {
  id: string;
  name: string;
  unit: "g" | "unit";
  active: boolean;
  purchasedQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  remainingValue: number;
  currentUnitCost: number | null;
  purchases: Array<{ id: string; purchased_at: string; quantity: number | string; total_cost: number | string; notes: string | null }>;
};

function money(value: number) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value || 0);
}

export default function MaterialsPanel() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState<"g" | "unit">("g");
  const [purchase, setPurchase] = useState({ materialId: "", purchasedAt: new Date().toISOString().slice(0, 10), quantity: "", totalCost: "", notes: "" });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/finance/materials", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los materiales");
      setMaterials(data.materials ?? []);
      setPurchase((current) => ({ ...current, materialId: current.materialId || data.materials?.[0]?.id || "" }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los materiales");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/finance/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar");
      setMaterials(data.materials ?? []);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createMaterial() {
    if (await post({ action: "createMaterial", name: newName, unit: newUnit })) {
      setNewName("");
      await load();
    }
  }
  async function addPurchase() {
    if (await post({ action: "addPurchase", materialId: purchase.materialId, purchasedAt: purchase.purchasedAt, quantity: Number(purchase.quantity), totalCost: Number(purchase.totalCost), notes: purchase.notes })) {
      setPurchase((current) => ({ ...current, quantity: "", totalCost: "", notes: "" }));
    }
  }

  return <div className="money-stack">
    {error ? <div className="money-error">{error}</div> : null}
    <section className="money-panel">
      <div className="money-section-title"><div><h2>Materiales</h2><p>Registra una compra completa una sola vez. Después, cada jornada descuenta únicamente lo que utilizaste.</p></div></div>
      <div className="money-material-create">
        <label>Material<input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Bolsas transparentes"/></label>
        <label>Lo medimos en<select value={newUnit} onChange={(e) => setNewUnit(e.target.value as "g" | "unit")}><option value="g">Gramos</option><option value="unit">Unidades</option></select></label>
        <button type="button" className="money-secondary" disabled={busy || !newName.trim()} onClick={() => void createMaterial()}><Plus size={16}/> Crear material</button>
      </div>
    </section>

    <section className="money-panel">
      <div className="money-section-title"><div><h3>Registrar compra de material</h3><p>Ejemplo: 1.000 g de bolsas por ₡3.000.</p></div></div>
      {materials.length === 0 ? <p className="money-empty">Primero crea un material.</p> : <div className="money-material-purchase">
        <label>Material<select value={purchase.materialId} onChange={(e) => setPurchase({ ...purchase, materialId: e.target.value })}>{materials.filter((material) => material.active).map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select></label>
        <label>Fecha<input type="date" value={purchase.purchasedAt} onChange={(e) => setPurchase({ ...purchase, purchasedAt: e.target.value })}/></label>
        <label>Cantidad<input inputMode="decimal" value={purchase.quantity} onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })} placeholder="0"/></label>
        <label>Total pagado<input inputMode="decimal" value={purchase.totalCost} onChange={(e) => setPurchase({ ...purchase, totalCost: e.target.value })} placeholder="₡0"/></label>
        <button type="button" className="money-primary" disabled={busy || !purchase.materialId || Number(purchase.quantity) <= 0} onClick={() => void addPurchase()}><PackagePlus size={16}/> Guardar compra</button>
      </div>}
    </section>

    <section className="money-material-grid">
      {loading ? <div className="money-panel money-loading">Cargando materiales…</div> : materials.map((material) => <article className="money-material-card" key={material.id}>
        <div className="money-material-card-head"><div><span>Inventario</span><h3>{material.name}</h3></div><strong>{material.remainingQuantity.toLocaleString("es-CR", { maximumFractionDigits: 3 })} {material.unit === "g" ? "g" : "un."}</strong></div>
        <div className="money-material-stats"><p><span>Valor restante</span><strong>{money(material.remainingValue)}</strong></p><p><span>Costo actual</span><strong>{material.currentUnitCost === null ? "—" : `${money(material.currentUnitCost)} / ${material.unit === "g" ? "g" : "un."}`}</strong></p><p><span>Comprado</span><strong>{material.purchasedQuantity.toLocaleString("es-CR", { maximumFractionDigits: 3 })}</strong></p><p><span>Utilizado</span><strong>{material.usedQuantity.toLocaleString("es-CR", { maximumFractionDigits: 3 })}</strong></p></div>
        {material.purchases.length ? <div className="money-purchase-history"><span>Últimas compras</span>{material.purchases.slice(0, 3).map((row) => <p key={row.id}><span>{row.purchased_at} · {Number(row.quantity).toLocaleString("es-CR")} {material.unit === "g" ? "g" : "un."}</span><strong>{money(Number(row.total_cost))}</strong></p>)}</div> : <p className="money-empty compact">Aún no hay compras.</p>}
      </article>)}
    </section>
  </div>;
}
