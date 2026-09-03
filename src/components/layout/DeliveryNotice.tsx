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

type AvailableCyclesResponse = {
  cycles?: DeliveryCycleSummary[];
};

export default function DeliveryNotice() {
  const [cycle, setCycle] = useState<DeliveryCycleSummary | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function loadCycle() {
      try {
        const response = await fetch("/api/delivery-cycles/available", {
          cache: "no-store",
        });
        const data = (await response.json()) as AvailableCyclesResponse;

        if (!cancelled && response.ok) {
          setCycle(data.cycles?.[0] ?? null);
        }
      } catch (error) {
        console.error("No se pudo cargar el aviso de entrega:", error);
      }
    }

    void loadCycle();
    const refresh = window.setInterval(loadCycle, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = useMemo(
    () => (cycle ? getRemainingMilliseconds(cycle.cutoff_at, now) : 0),
    [cycle, now]
  );

  if (!cycle || remaining <= 0) return null;

  const deliveryLabel = formatDeliveryDate(cycle.delivery_date);
  const urgent = isUnder24Hours(cycle.cutoff_at, now);

  return (
    <div className={`delivery-notice ${urgent ? "delivery-notice--urgent" : ""}`}>
      <div className="container delivery-notice-inner">
        {urgent ? (
          <>
            <strong>Recibí tu pedido este {deliveryLabel.split(",")[0]}</strong>
            <span>Pedí en {formatCountdown(remaining)}</span>
            <span>Cierre: {formatCutoffLabel(cycle.cutoff_at)}</span>
          </>
        ) : (
          <>
            <strong>Próxima entrega: {deliveryLabel}</strong>
            <span>Pedidos hasta {formatCutoffLabel(cycle.cutoff_at)}</span>
          </>
        )}
      </div>
    </div>
  );
}
