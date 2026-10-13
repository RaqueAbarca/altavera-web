export const ALTAVERA_REVIEW_URL = "https://g.page/r/CZ3xrpmV8wfOECE/review";

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

export type OrderWhatsAppStatus =
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export function buildOrderStatusWhatsAppMessage(input: {
  customerName: string;
  orderId: string;
  status: OrderWhatsAppStatus;
  deliveryWindowLabel?: string | null;
  estimatedArrivalLabel?: string | null;
  reviewUrl?: string | null;
}) {
  const customerName = input.customerName.trim() || "cliente";
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const deliveryWindow = String(input.deliveryWindowLabel ?? "").trim();
  const estimatedArrival = String(input.estimatedArrivalLabel ?? "").trim();
  const reviewUrl = String(input.reviewUrl ?? ALTAVERA_REVIEW_URL).trim();

  const messages: Record<OrderWhatsAppStatus, string[]> = {
    confirmed: [
      `Hola ${customerName}, ya confirmamos el pago de tu pedido #${shortOrderId} de Altavera.`,
      "Tu pedido quedó confirmado para la fecha de entrega seleccionada.",
      "Te avisaremos cuando comencemos a prepararlo. También recibirás las actualizaciones importantes por correo.",
    ],
    preparing: [
      `Hola ${customerName}, estamos preparando tu pedido #${shortOrderId} de Altavera.`,
      deliveryWindow
        ? `Tu entrega está programada dentro del horario general de ${deliveryWindow}.`
        : "Tu entrega está programada dentro del horario general indicado al realizar el pedido.",
      "Te avisaremos cuando salga para entrega.",
    ],
    ready: [
      `Hola ${customerName}, tu pedido #${shortOrderId} de Altavera ya va en camino.`,
      estimatedArrival
        ? `Hora estimada de llegada: alrededor de las ${estimatedArrival}.`
        : deliveryWindow
          ? `La entrega está prevista dentro del horario general de ${deliveryWindow}.`
          : "La entrega está prevista para hoy.",
      "La hora puede variar un poco según el tránsito y las entregas anteriores.",
    ],
    delivered: [
      `Hola ${customerName}, tu pedido #${shortOrderId} de Altavera fue marcado como entregado.`,
      "Muchas gracias por comprar con nosotros. Esperamos que disfrutés tus productos.",
      reviewUrl
        ? `Si querés contarnos cómo fue tu experiencia, podés dejarnos una reseña en Google aquí:\n${reviewUrl}`
        : "Si necesitás ayuda con tu pedido, podés escribirnos por este mismo chat.",
      "Si necesitás ayuda con tu pedido, podés escribirnos por este mismo chat.",
    ],
    cancelled: [
      `Hola ${customerName}, tu pedido #${shortOrderId} de Altavera fue cancelado.`,
      "Si tenés alguna consulta sobre el pedido o el pago, podés escribirnos por este mismo chat y con gusto lo revisamos.",
    ],
  };

  return messages[input.status].filter(Boolean).join("\n\n");
}

export function buildOrderOnTheWayMessage(input: {
  customerName: string;
  orderId: string;
  deliveryWindowLabel?: string | null;
  estimatedArrivalLabel?: string | null;
}) {
  return buildOrderStatusWhatsAppMessage({ ...input, status: "ready" });
}

export function buildOrderPaymentInstructionsMessage(input: {
  customerName: string;
  orderId: string;
  deliveryDate: string;
  deliveryWindowLabel?: string | null;
  total: string;
  paymentMethod: string;
}) {
  const customerName = input.customerName.trim() || "cliente";
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const paymentMethod = input.paymentMethod.trim() || "el método seleccionado";
  const deliveryWindow = String(input.deliveryWindowLabel ?? "").trim();

  return [
    `Hola ${customerName}, gracias por tu pedido en Altavera.`,
    `Pedido #${shortOrderId}\nEntrega: ${input.deliveryDate}${deliveryWindow ? `\nHorario general: ${deliveryWindow}` : ""}\nTotal: ${input.total}\nMétodo de pago seleccionado: ${paymentMethod}`,
    "Para confirmar tu pedido, realizá el pago por el medio que seleccionaste al realizar la compra, ya sea SINPE Móvil o transferencia bancaria.",
    "Una vez realizado el pago, podés enviarnos el comprobante por este mismo chat para verificarlo.",
    "El resumen completo de tu pedido, con productos, cantidades y precios, fue enviado al correo que registraste. También recibirás por correo las actualizaciones importantes del pedido.",
    "Una vez verificado el pago, confirmaremos tu pedido.",
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

export function buildPaymentProofMessage(input: {
  orderId: string;
  total: string;
  paymentMethod: string;
}) {
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();

  return [
    "Hola, Altavera.",
    `Adjunto el comprobante de pago de mi pedido #${shortOrderId} por ${input.total}.`,
    `Método de pago: ${input.paymentMethod}.`,
    "Por favor, confirmen cuando el pago haya sido verificado.",
  ].join("\n\n");
}
