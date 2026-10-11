"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit3, Gift, Plus, Power, PowerOff, X } from "lucide-react";
import "./codigos.css";

type PromoCode = {
  id: string;
  code: string;
  label: string | null;
  discount_type: "free_shipping";
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
  updated_at: string;
};

type PromoForm = {
  code: string;
  label: string;
  startsAt: string;
  expiresAt: string;
  maxUses: string;
  isActive: boolean;
};

const EMPTY_FORM: PromoForm = {
  code: "",
  label: "Envío gratis",
  startsAt: "",
  expiresAt: "",
  maxUses: "",
  isActive: true,
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) return "Sin límite";
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminCodigosPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPromoCodes() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/promo-codes", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los códigos");
      setPromoCodes(data.promoCodes ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los códigos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPromoCodes();
  }, []);

  const activeCount = useMemo(
    () => promoCodes.filter((promo) => promo.is_active).length,
    [promoCodes]
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMessage("");
    setError("");
  }

  function openEdit(promo: PromoCode) {
    setEditingId(promo.id);
    setForm({
      code: promo.code,
      label: promo.label || "Envío gratis",
      startsAt: toLocalInput(promo.starts_at),
      expiresAt: toLocalInput(promo.expires_at),
      maxUses: promo.max_uses?.toString() ?? "",
      isActive: promo.is_active,
    });
    setShowForm(true);
    setMessage("");
    setError("");
  }

  function closeForm() {
    setEditingId(null);
    setShowForm(false);
    setForm(EMPTY_FORM);
  }

  async function savePromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        editingId ? `/api/admin/promo-codes/${editingId}` : "/api/admin/promo-codes",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: form.code,
            label: form.label,
            startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
            expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
            maxUses: form.maxUses || null,
            isActive: form.isActive,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar el código");

      setMessage(editingId ? "Código actualizado." : "Código creado y listo para usar.");
      closeForm();
      await loadPromoCodes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el código");
    } finally {
      setSaving(false);
    }
  }

  async function togglePromo(promo: PromoCode) {
    setWorkingId(promo.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/promo-codes/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promo.code,
          label: promo.label,
          startsAt: promo.starts_at,
          expiresAt: promo.expires_at,
          maxUses: promo.max_uses,
          isActive: !promo.is_active,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar el código");

      setPromoCodes((current) =>
        current.map((item) => (item.id === promo.id ? data.promoCode : item))
      );
      setMessage(!promo.is_active ? `${promo.code} está activo.` : `${promo.code} quedó desactivado.`);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar el código");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main className="promo-admin-page">
      <section className="promo-admin-hero">
        <div>
          <span className="promo-admin-eyebrow">Promociones</span>
          <h1>Códigos promocionales</h1>
          <p>Creá códigos de envío gratis y decidí exactamente cuándo pueden utilizarse.</p>
        </div>
        <button type="button" className="promo-primary-button" onClick={openCreate}>
          <Plus size={18} /> Crear código
        </button>
      </section>

      <section className="promo-stats" aria-label="Resumen de códigos">
        <div><span>Total</span><strong>{promoCodes.length}</strong></div>
        <div><span>Activos</span><strong>{activeCount}</strong></div>
        <div><span>Usos registrados</span><strong>{promoCodes.reduce((sum, promo) => sum + promo.use_count, 0)}</strong></div>
      </section>

      {message && <div className="promo-message promo-message--success"><CheckCircle2 size={18} />{message}</div>}
      {error && <div className="promo-message promo-message--error">{error}</div>}

      {showForm && (
        <section className="promo-form-card">
          <div className="promo-form-card__heading">
            <div>
              <span>{editingId ? "Editar" : "Nuevo código"}</span>
              <h2>{editingId ? "Actualizar código promocional" : "Crear código de envío gratis"}</h2>
            </div>
            <button type="button" className="promo-icon-button" onClick={closeForm} aria-label="Cerrar formulario">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={savePromo} className="promo-form">
            <label>
              <span>Código</span>
              <input
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/\s/g, "") }))}
                placeholder="FAMILIAALTAVERA"
                maxLength={40}
                required
              />
            </label>
            <label>
              <span>Descripción</span>
              <input
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="Familia y amigos"
                maxLength={120}
              />
            </label>
            <div className="promo-benefit-box">
              <Gift size={20} />
              <div><span>Beneficio</span><strong>Envío gratis</strong></div>
            </div>
            <div className="promo-form-grid">
              <label>
                <span>Disponible desde</span>
                <input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} />
                <small>Vacío = disponible inmediatamente.</small>
              </label>
              <label>
                <span>Vence</span>
                <input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} />
                <small>Vacío = no vence automáticamente.</small>
              </label>
            </div>
            <label className="promo-max-uses">
              <span>Máximo de usos</span>
              <input type="number" min="1" step="1" value={form.maxUses} onChange={(event) => setForm((current) => ({ ...current, maxUses: event.target.value }))} placeholder="Sin límite" />
              <small>Podés dejarlo vacío si querés apagarlo manualmente cuando termine la prueba.</small>
            </label>
            <label className="promo-toggle-field">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              <span>El código queda activo al guardarlo</span>
            </label>
            <div className="promo-form-actions">
              <button type="button" className="promo-secondary-button" onClick={closeForm}>Cancelar</button>
              <button type="submit" className="promo-primary-button" disabled={saving}>{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear código"}</button>
            </div>
          </form>
        </section>
      )}

      <section className="promo-list">
        {loading ? (
          <div className="promo-empty">Cargando códigos...</div>
        ) : promoCodes.length === 0 ? (
          <div className="promo-empty">
            <Gift size={32} />
            <h2>Todavía no hay códigos</h2>
            <p>Creá el primero para dar envío gratis a familia y amigos.</p>
          </div>
        ) : (
          promoCodes.map((promo) => {
            const limitReached = promo.max_uses !== null && promo.use_count >= promo.max_uses;
            return (
              <article className="promo-card" key={promo.id}>
                <div className="promo-card__top">
                  <div>
                    <div className="promo-card__code">{promo.code}</div>
                    <p>{promo.label || "Envío gratis"}</p>
                  </div>
                  <span className={`promo-status ${promo.is_active ? "is-active" : "is-inactive"}`}>
                    {promo.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="promo-card__benefit"><Gift size={17} /><strong>Envío gratis</strong></div>
                <dl className="promo-card__details">
                  <div><dt>Usos</dt><dd>{promo.use_count}{promo.max_uses === null ? " / sin límite" : ` / ${promo.max_uses}`}</dd></div>
                  <div><dt>Desde</dt><dd>{formatDate(promo.starts_at)}</dd></div>
                  <div><dt>Vence</dt><dd>{formatDate(promo.expires_at)}</dd></div>
                </dl>
                {limitReached && <div className="promo-limit-note">Este código alcanzó su máximo de usos.</div>}
                <div className="promo-card__actions">
                  <button type="button" className="promo-secondary-button" onClick={() => openEdit(promo)}><Edit3 size={16} /> Editar</button>
                  <button
                    type="button"
                    className={promo.is_active ? "promo-danger-button" : "promo-primary-button"}
                    onClick={() => togglePromo(promo)}
                    disabled={workingId === promo.id}
                  >
                    {promo.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                    {workingId === promo.id ? "Guardando..." : promo.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
