import type { DeliveryScheduleRule } from "@/lib/appSettings";

export const DELIVERY_TIMEZONE = "America/Costa_Rica";

export type DeliveryCycleSummary = {
  id: string;
  delivery_date: string;
  cutoff_at: string;
  status: "open" | "closed";
  window_start_time?: string | null;
  window_end_time?: string | null;
};

function deliveryDateToDate(deliveryDate: string) {
  return new Date(`${deliveryDate}T12:00:00-06:00`);
}

export function formatDeliveryDate(
  deliveryDate: string,
  options?: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: DELIVERY_TIMEZONE,
    ...options,
  }).format(deliveryDateToDate(deliveryDate));
}

export function formatDeliveryDateShort(deliveryDate: string) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: DELIVERY_TIMEZONE,
  }).format(deliveryDateToDate(deliveryDate));
}

export function formatCutoffLabel(cutoffAt: string) {
  const cutoff = new Date(cutoffAt);
  const day = new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    timeZone: DELIVERY_TIMEZONE,
  }).format(cutoff);

  const time = new Intl.DateTimeFormat("es-CR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DELIVERY_TIMEZONE,
  }).format(cutoff);

  return `${day} · ${time}`;
}

export function formatClockTime(value: string | null | undefined) {
  const match = String(value ?? "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return "";
  const date = new Date(`2000-01-01T${match[1]}:${match[2]}:00-06:00`);
  return new Intl.DateTimeFormat("es-CR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DELIVERY_TIMEZONE,
  }).format(date);
}

export function formatDeliveryWindow(
  startTime: string | null | undefined,
  endTime: string | null | undefined
) {
  const start = formatClockTime(startTime);
  const end = formatClockTime(endTime);
  if (!start || !end) return "";
  return `${start} – ${end}`;
}

export function getDeliveryWeekday(deliveryDate: string) {
  return deliveryDateToDate(deliveryDate).getUTCDay();
}

export function getDeliveryWindowRule(
  schedule: DeliveryScheduleRule[],
  deliveryDate: string
) {
  const weekday = getDeliveryWeekday(deliveryDate);
  return schedule.find((rule) => rule.deliveryWeekday === weekday) ?? null;
}

export function getDeliveryWindowLabel(
  schedule: DeliveryScheduleRule[],
  deliveryDate: string
) {
  const rule = getDeliveryWindowRule(schedule, deliveryDate);
  if (!rule) return "";
  return formatDeliveryWindow(rule.windowStartTime, rule.windowEndTime);
}

export function getDeliveryRouteStart(
  deliveryDate: string,
  windowStartTime: string,
  now = new Date()
) {
  const scheduled = new Date(`${deliveryDate}T${windowStartTime}:00-06:00`);
  if (!Number.isFinite(scheduled.getTime())) return now;
  return new Date(Math.max(scheduled.getTime(), now.getTime()));
}

export function formatEstimatedArrival(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DELIVERY_TIMEZONE,
  }).format(date);
}

export function getRemainingMilliseconds(
  cutoffAt: string,
  now = Date.now()
) {
  return Math.max(0, new Date(cutoffAt).getTime() - now);
}

export function isUnder24Hours(cutoffAt: string, now = Date.now()) {
  const remaining = getRemainingMilliseconds(cutoffAt, now);
  return remaining > 0 && remaining <= 24 * 60 * 60 * 1000;
}

export function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  }

  if (minutes > 0) {
    return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
  }

  return `${seconds} s`;
}

export function getCostaRicaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DELIVERY_TIMEZONE,
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}
