export function formatCRC(value: number) {
  return `₡${Math.round(value).toLocaleString("es-CR")}`;
}
