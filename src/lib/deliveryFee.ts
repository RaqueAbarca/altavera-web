const configuredDeliveryFee = Number(
  process.env.NEXT_PUBLIC_DELIVERY_FEE_CRC ?? 0
);

export const DELIVERY_FEE_CRC =
  Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee >= 0
    ? Math.round(configuredDeliveryFee)
    : 0;

export function formatCRC(value: number) {
  return `₡${Math.round(value).toLocaleString("es-CR")}`;
}
