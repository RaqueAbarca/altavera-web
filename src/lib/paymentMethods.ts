export const PAYMENT_METHODS = ["SINPE", "BANK_TRANSFER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}

export function getPaymentMethodLabel(method: string) {
  if (method === "BANK_TRANSFER") return "Transferencia bancaria";
  if (method === "SINPE") return "SINPE Móvil";
  return method;
}
