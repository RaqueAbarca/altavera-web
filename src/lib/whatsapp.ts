export const ALTAVERA_FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScF22cMfkJ8UiCgkeVtzibBRqkJYAWYkozBm7q8j-ppxwNjRg/viewform";

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
  deliveryDateLabel?: string | null;
  deliveryWindowLabel?: string | null;
  estimatedArrivalLabel?: string | null;
  reviewUrl?: string | null;
}) {
  const customerName = input.customerName.trim() || "cliente";
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const deliveryDate = String(input.deliveryDateLabel ?? "").trim() || "la fecha de entrega seleccionada";
  const deliveryWindow = String(input.deliveryWindowLabel ?? "").trim();
  const estimatedArrival = String(input.estimatedArrivalLabel ?? "").trim();
  const reviewUrl = String(input.reviewUrl ?? ALTAVERA_FEEDBACK_FORM_URL).trim();

  const messages: Record<OrderWhatsAppStatus, string[]> = {
    confirmed: [
      `Hola, *${customerName}*.`,
      `¡Ya confirmamos el pago de tu pedido *#${shortOrderId}* de Altavera!`,
      `Tu pedido quedó confirmado para *${deliveryDate}*.`,
      deliveryWindow
        ? `Nuestro horario de entrega es de *${deliveryWindow}*`
        : "Tu entrega se realizará dentro del horario indicado al hacer el pedido.",
      "La noche anterior a tu entrega te compartiremos una hora aproximada de llegada. Esta estimación podría cambiar por el tráfico o por situaciones logísticas. Cuando tu pedido vaya en camino, te enviaremos una hora estimada actualizada para que podás estar pendiente.",
      "También te avisaremos cuando comencemos a preparar tu pedido. Si al realizar la compra seleccionaste recibir correos electrónicos, también podrás recibir las actualizaciones importantes por ese medio.",
      "*¡Muchas gracias por confiar en Altavera!* Nos alegra poder llevar frutas y verduras frescas hasta la puerta de tu hogar.",
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
      `Hola, *${customerName}*.`,
      `¡Tu pedido *#${shortOrderId}* de Altavera ya fue entregado!`,
      "Muchas gracias por confiar en nosotros. Esperamos que disfrutés tus frutas y verduras frescas.",
      "*Nos encantaría conocer tu experiencia.*",
      "Preparamos un pequeño formulario para que podás contarnos qué te pareció nuestro servicio, la calidad de los productos y la entrega. Tus comentarios nos ayudan a seguir mejorando.",
      reviewUrl ? `Podés completarlo aquí:\n${reviewUrl}` : "",
      "Si tenés alguna consulta o necesitás ayuda con tu pedido, podés escribirnos directamente por este mismo chat.",
      "*¡Gracias por elegir Altavera!*",
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

export const ALTAVERA_REVIEW_URL = "https://g.page/r/CZ3xrpmV8wfOECE/review";
