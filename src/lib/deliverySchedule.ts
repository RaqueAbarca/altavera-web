export const DELIVERY_TIMEZONE = "America/Costa_Rica";

export type DeliveryCycleSummary = {
  id: string;
  delivery_date: string;
  cutoff_at: string;
  status: "open" | "closed";
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
