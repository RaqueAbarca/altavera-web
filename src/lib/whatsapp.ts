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
}) {
  const customerName = input.customerName.trim() || "cliente";
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();

  const messages: Record<OrderWhatsAppStatus, string[]> = {
    confirmed: [
      `Hola ${customerName}, ya confirmamos el pago de tu pedido #${shortOrderId} de Altavera 🌿`,
      "Tu pedido quedó confirmado para la fecha de entrega seleccionada.",
      "Te avisaremos cuando comencemos a prepararlo.",
    ],
    preparing: [
      `Hola ${customerName}, estamos preparando tu pedido #${shortOrderId} de Altavera 🌿`,
      "Ya comenzamos a preparar tus productos para la fecha de entrega seleccionada.",
      "Te avisaremos cuando salga para entrega.",
    ],
    ready: [
      `Hola ${customerName}, tu pedido #${shortOrderId} de Altavera ya va en camino 🚚`,
      "Lo entregaremos en la ubicación que registraste al hacer tu pedido.",
      "¡Gracias por comprar con nosotros!",
    ],
    delivered: [
      `Hola ${customerName}, tu pedido #${shortOrderId} de Altavera fue marcado como entregado 🌿`,
      "Muchas gracias por comprar con nosotros. Esperamos que disfrutés tus productos.",
      "Si necesitás ayuda con tu pedido, podés escribirnos por este mismo chat.",
    ],
    cancelled: [
      `Hola ${customerName}, tu pedido #${shortOrderId} de Altavera fue cancelado.`,
      "Si tenés alguna consulta sobre el pedido o el pago, podés escribirnos por este mismo chat y con gusto lo revisamos.",
    ],
  };

  return messages[input.status].join("\n\n");
}

export function buildOrderOnTheWayMessage(input: {
  customerName: string;
  orderId: string;
}) {
  return buildOrderStatusWhatsAppMessage({ ...input, status: "ready" });
}


export function buildOrderPaymentInstructionsMessage(input: {
  customerName: string;
  orderId: string;
  deliveryDate: string;
  total: string;
  paymentMethod: string;
}) {
  const customerName = input.customerName.trim() || "cliente";
  const shortOrderId = input.orderId.slice(0, 8).toUpperCase();
  const paymentMethod = input.paymentMethod.trim() || "el método seleccionado";

  return [
    `Hola ${customerName}, gracias por tu pedido en Altavera 🌿`,
    `Pedido #${shortOrderId}\nEntrega: ${input.deliveryDate}\nTotal: ${input.total}\nMétodo de pago seleccionado: ${paymentMethod}`,
    "Para confirmar tu pedido, realizá el pago por el medio que seleccionaste al realizar la compra, ya sea SINPE Móvil o transferencia bancaria.",
    "Una vez realizado el pago, podés enviarnos el comprobante por este mismo chat para verificarlo.",
    "Si querés recibir el detalle completo de tu pedido, incluyendo productos, cantidades y precios, indicánoslo por aquí y con gusto te lo compartimos.",
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
