import { getRawAppSettings, parseDeliverySchedule } from "@/lib/appSettings.server";
import { getCostaRicaDateKey } from "@/lib/deliverySchedule";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { DeliveryScheduleRule } from "@/lib/appSettings";

const SCHEDULE_HORIZON_DAYS = 56;

type DeliveryCycleRow = {
  id: string;
  delivery_date: string;
  cutoff_at: string;
  status: "open" | "closed";
};

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayForDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

function cutoffForDeliveryDate(
  deliveryDate: string,
  rule: DeliveryScheduleRule
) {
  const daysBefore =
    (rule.deliveryWeekday - rule.cutoffWeekday + 7) % 7;
  const cutoffDate = addDays(deliveryDate, -daysBefore);
  return new Date(
    `${cutoffDate}T${rule.cutoffTime}:00-06:00`
  ).toISOString();
}

function desiredDeliveryCycles(
  startDate: string,
  schedule: DeliveryScheduleRule[]
) {
  const byWeekday = new Map(
    schedule.map((rule) => [rule.deliveryWeekday, rule])
  );
  const desired = new Map<string, string>();

  for (let offset = 0; offset <= SCHEDULE_HORIZON_DAYS; offset += 1) {
    const deliveryDate = addDays(startDate, offset);
    const rule = byWeekday.get(weekdayForDate(deliveryDate));
    if (!rule) continue;
    desired.set(deliveryDate, cutoffForDeliveryDate(deliveryDate, rule));
  }

  return desired;
}

async function reconcileConfiguredSchedule(schedule: DeliveryScheduleRule[]) {
  const today = getCostaRicaDateKey();
  const horizonEnd = addDays(today, SCHEDULE_HORIZON_DAYS);
  const desired = desiredDeliveryCycles(today, schedule);
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  const { data, error } = await supabaseAdmin
    .from("delivery_cycles")
    .select("id,delivery_date,cutoff_at,status")
    .gte("delivery_date", today)
    .lte("delivery_date", horizonEnd)
    .order("delivery_date", { ascending: true });

  if (error) throw error;

  const existing = (data ?? []) as DeliveryCycleRow[];
  const byDate = new Map(existing.map((cycle) => [cycle.delivery_date, cycle]));

  for (const cycle of existing) {
    const desiredCutoff = desired.get(cycle.delivery_date);

    if (!desiredCutoff) {
      if (cycle.status === "open") {
        const { error: closeError } = await supabaseAdmin
          .from("delivery_cycles")
          .update({ status: "closed", closed_at: nowIso })
          .eq("id", cycle.id);
        if (closeError) throw closeError;
      }
      continue;
    }

    // No reabrimos automáticamente un ciclo que ya fue cerrado/finalizado.
    // Si el admin cambia el calendario, los siguientes ciclos sí nacen con la
    // regla nueva, pero un cierre operativo ya ejecutado se respeta.
    const shouldBeOpen =
      cycle.status === "open" && new Date(desiredCutoff).getTime() > nowMs;
    const nextStatus: "open" | "closed" = shouldBeOpen ? "open" : "closed";
    const needsUpdate =
      cycle.cutoff_at !== desiredCutoff || cycle.status !== nextStatus;

    if (needsUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from("delivery_cycles")
        .update({
          cutoff_at: desiredCutoff,
          status: nextStatus,
          closed_at: shouldBeOpen ? null : nowIso,
        })
        .eq("id", cycle.id);
      if (updateError) throw updateError;
    }
  }

  for (const [deliveryDate, cutoffAt] of desired) {
    if (byDate.has(deliveryDate)) continue;
    if (new Date(cutoffAt).getTime() <= nowMs) continue;

    const { error: insertError } = await supabaseAdmin
      .from("delivery_cycles")
      .insert({
        delivery_date: deliveryDate,
        cutoff_at: cutoffAt,
        status: "open",
      });

    // Dos solicitudes pueden intentar crear el mismo ciclo al mismo tiempo.
    // Si la tabla ya tiene una restricción única por fecha, ignoramos solo ese caso.
    if (insertError && insertError.code !== "23505") {
      throw insertError;
    }
  }
}

export async function syncDeliveryCycles() {
  // Conservamos la función histórica porque también se encarga de cerrar/finalizar
  // ciclos existentes y de mantener el flujo operativo previo de Altavera.
  const { error } = await supabaseAdmin.rpc(
    "altavera_finalize_delivery_cycles"
  );

  if (error) {
    throw error;
  }

  const settings = await getRawAppSettings();
  const schedule = parseDeliverySchedule(
    settings?.delivery_pricing?.delivery_schedule
  );

  // Hasta que el admin guarde un calendario nuevo, no alteramos el calendario
  // histórico existente. Esto permite desplegar el cambio sin inventar un corte.
  if (schedule.length === 0) return;

  await reconcileConfiguredSchedule(schedule);
}
