"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, Pencil, Star, Trash2, X } from "lucide-react";
import type { SavedAddress } from "@/types/address";

type EditDraft = {
  label: string;
  addressDescription: string;
};

export default function AddressCard() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<EditDraft>({
    label: "",
    addressDescription: "",
  });
  const [feedback, setFeedback] = useState("");

  async function loadAddresses() {
    try {
      const response = await fetch("/api/addresses", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar tus direcciones");
      }

      setAddresses((data.addresses ?? []) as SavedAddress[]);
      setFeedback("");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "No se pudieron cargar tus direcciones."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAddresses();
  }, []);

  function startEditing(address: SavedAddress) {
    setEditingId(address.id);
    setDraft({
      label: address.label,
      addressDescription: address.address_description ?? "",
    });
    setFeedback("");
  }

  function cancelEditing() {
    setEditingId("");
    setDraft({ label: "", addressDescription: "" });
  }

  async function updateAddress(
    id: string,
    body: Record<string, unknown>,
    successMessage: string
  ) {
    if (workingId) return;

    setWorkingId(id);
    setFeedback("");

    try {
      const response = await fetch(`/api/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar la dirección");
      }

      await loadAddresses();
      setEditingId("");
      setFeedback(successMessage);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "No se pudo actualizar la dirección."
      );
    } finally {
      setWorkingId("");
    }
  }

  async function saveEdit(address: SavedAddress) {
    const label = draft.label.trim();

    if (!label) {
      setFeedback("Ponle un nombre a la dirección, por ejemplo Casa o Trabajo.");
      return;
    }

    await updateAddress(
      address.id,
      {
        label,
        address_description: draft.addressDescription.trim() || null,
      },
      "Dirección actualizada."
    );
  }

  async function deleteAddress(address: SavedAddress) {
    const confirmed = window.confirm(
      `¿Eliminar la dirección “${address.label}”?`
    );

    if (!confirmed || workingId) return;

    setWorkingId(address.id);
    setFeedback("");

    try {
      const response = await fetch(`/api/addresses/${address.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar la dirección");
      }

      await loadAddresses();
      setFeedback("Dirección eliminada.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "No se pudo eliminar la dirección."
      );
    } finally {
      setWorkingId("");
    }
  }

  return (
    <section className="profile-card" id="direcciones">
      <div className="profile-addresses-heading">
        <div>
          <h2>Mis direcciones</h2>
          <p>
            Guarda Casa, Trabajo u otros lugares para elegirlos rápidamente al comprar.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="profile-muted">Cargando direcciones...</p>
      ) : addresses.length === 0 ? (
        <div className="profile-address-empty">
          <MapPin size={22} aria-hidden="true" />
          <div>
            <strong>Todavía no tienes direcciones guardadas</strong>
            <p>
              En tu próxima compra, marca una ubicación en el mapa y podrás guardarla desde el checkout.
            </p>
          </div>
        </div>
      ) : (
        <div className="profile-address-list">
          {addresses.map((address) => {
            const editing = editingId === address.id;
            const working = workingId === address.id;

            return (
              <article className="profile-address-item" key={address.id}>
                <div className="profile-address-item__icon" aria-hidden="true">
                  <MapPin size={20} />
                </div>

                <div className="profile-address-item__content">
                  {editing ? (
                    <div className="profile-address-edit">
                      <label>
                        <span>Nombre</span>
                        <input
                          type="text"
                          value={draft.label}
                          maxLength={50}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              label: event.target.value,
                            }))
                          }
                          placeholder="Casa, Trabajo..."
                        />
                      </label>

                      <label>
                        <span>Descripción</span>
                        <textarea
                          value={draft.addressDescription}
                          maxLength={500}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              addressDescription: event.target.value,
                            }))
                          }
                          placeholder="Condominio, número de casa, color del portón..."
                        />
                      </label>

                      <div className="profile-address-edit__actions">
                        <button
                          type="button"
                          className="profile-address-action profile-address-action--primary"
                          disabled={working}
                          onClick={() => void saveEdit(address)}
                        >
                          <Check size={16} />
                          Guardar
                        </button>
                        <button
                          type="button"
                          className="profile-address-action"
                          disabled={working}
                          onClick={cancelEditing}
                        >
                          <X size={16} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="profile-address-item__title">
                        <strong>{address.label}</strong>
                        {address.is_default && <span>Principal</span>}
                      </div>
                      <p>
                        {address.address_description ||
                          "Ubicación guardada en el mapa, sin descripción adicional."}
                      </p>
                    </>
                  )}
                </div>

                {!editing && (
                  <div className="profile-address-item__actions">
                    {!address.is_default && (
                      <button
                        type="button"
                        className="profile-address-icon-btn"
                        title="Usar como dirección principal"
                        aria-label={`Usar ${address.label} como dirección principal`}
                        disabled={working}
                        onClick={() =>
                          void updateAddress(
                            address.id,
                            { is_default: true },
                            "Dirección principal actualizada."
                          )
                        }
                      >
                        <Star size={17} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="profile-address-icon-btn"
                      title="Editar dirección"
                      aria-label={`Editar ${address.label}`}
                      disabled={working}
                      onClick={() => startEditing(address)}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      type="button"
                      className="profile-address-icon-btn profile-address-icon-btn--danger"
                      title="Eliminar dirección"
                      aria-label={`Eliminar ${address.label}`}
                      disabled={working}
                      onClick={() => void deleteAddress(address)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {feedback && (
        <p className="profile-address-feedback" role="status">
          {feedback}
        </p>
      )}

      {addresses.length > 0 && (
        <p className="profile-address-hint">
          Para guardar un punto nuevo o cambiar la ubicación exacta, marca el nuevo punto durante el checkout y guárdalo con el nombre que quieras.
        </p>
      )}
    </section>
  );
}
