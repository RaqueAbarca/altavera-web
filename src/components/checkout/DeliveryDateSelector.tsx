"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatCountdown,
  formatCutoffLabel,
  formatDeliveryDate,
  getRemainingMilliseconds,
  isUnder24Hours,
  type DeliveryCycleSummary,
} from "@/lib/deliverySchedule";

type Props = {
  cycles: DeliveryCycleSummary[];
  selectedId: string;
  loading: boolean;
  error: string;
  onChange: (cycleId: string) => void;
};

export default function DeliveryDateSelector({
  cycles,
  selectedId,
  loading,
  error,
  onChange,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedCycle = useMemo(
    () => cycles.find((cycle) => cycle.id === selectedId) ?? null,
    [cycles, selectedId]
  );

  if (loading) {
    return (
      <section className="delivery-date-section">
        <h2>Fecha de entrega</h2>
        <p className="delivery-date-loading">Cargando próximas entregas...</p>
      </section>
    );
  }

  if (error || cycles.length === 0) {
    return (
      <section className="delivery-date-section">
        <h2>Fecha de entrega</h2>
        <p className="delivery-date-error">
          {error || "No hay fechas de entrega disponibles por el momento."}
        </p>
      </section>
    );
  }

  return (
    <section className="delivery-date-section">
      <div className="delivery-date-heading">
        <h2>Fecha de entrega</h2>
        <p>Elegí la fecha que mejor te funcione.</p>
      </div>

      <div className="delivery-date-options">
        {cycles.map((cycle, index) => {
          const remaining = getRemainingMilliseconds(cycle.cutoff_at, now);
          const urgent = isUnder24Hours(cycle.cutoff_at, now);
          const checked = cycle.id === selectedId;

          return (
            <label
              key={cycle.id}
              className={`delivery-date-card ${checked ? "delivery-date-card--selected" : ""}`}
            >
              <input
                type="radio"
                name="delivery_cycle"
                value={cycle.id}
                checked={checked}
                onChange={() => onChange(cycle.id)}
              />

              <span className="delivery-date-card-content">
                <span className="delivery-date-card-topline">
                  <strong>{formatDeliveryDate(cycle.delivery_date)}</strong>
                  {index === 0 && <em>Próxima entrega</em>}
                </span>

                {urgent ? (
                  <span className="delivery-date-countdown">
                    Pedí en <b>{formatCountdown(remaining)}</b> para recibirlo en esta entrega.
                  </span>
                ) : (
                  <span className="delivery-date-cutoff">
                    Pedidos hasta {formatCutoffLabel(cycle.cutoff_at)}
                  </span>
                )}

                {urgent && (
                  <span className="delivery-date-cutoff">
                    Cierre de pedidos: {formatCutoffLabel(cycle.cutoff_at)}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {selectedCycle && (
        <p className="delivery-date-confirmation">
          Tu pedido quedará programado para {formatDeliveryDate(selectedCycle.delivery_date)}.
        </p>
      )}
    </section>
  );
}
