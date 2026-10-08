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
    `Hola ${customerName}, gracias por tu pedido en Altavera!`,
    `Tu pedido es el #${shortOrderId}\nEntrega: ${input.deliveryDate}\nTotal: ${input.total}\nMétodo de pago seleccionado: ${paymentMethod}`,
    "Para confirmar tu pedido, realizá el pago por el medio que seleccionaste al realizar la compra.",
    "Una vez realizado el pago, podés enviarnos el comprobante por este mismo chat para verificarlo.",
    "Si querés recibir el detalle completo de tu pedido, incluyendo productos, cantidades y precios, indicánoslo por aquí y con gusto te lo compartimos.",
    "Una vez verificado el pago, confirmaremos tu pedido.",
    "Quedamos a la espera, muchas gracias por tu compra!",
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
