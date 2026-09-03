export function normalizeWhatsAppPhone(value: string | null | undefined) {
  let digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (!digits) return null;

  // Los números locales de Costa Rica tienen 8 dígitos.
  if (digits.length === 8) {
    return `506${digits}`;
  }

  return digits;
}

export function buildOrderOnTheWayMessage(input: {
  customerName: string;
  orderId: string;
}) {
  const customerName = input.customerName.trim() || "cliente";
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();

  return [
    `Hola ${customerName}, tu pedido #${shortOrderId} de Altavera ya va en camino.`,
    "Lo entregaremos en la ubicación que registraste al hacer tu pedido.",
    "¡Gracias por comprar con nosotros!",
  ].join("\n\n");
}

export function buildWhatsAppUrl(input: {
  phone: string | null | undefined;
  message: string;
}) {
  const phone = normalizeWhatsAppPhone(input.phone);
  if (!phone) return null;

  return `https://wa.me/${phone}?text=${encodeURIComponent(input.message)}`;
}
