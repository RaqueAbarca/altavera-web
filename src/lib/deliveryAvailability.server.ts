import { evaluateStoredDeliveryLocation } from "@/lib/deliveryZones.server";
import type { DeliveryAvailability } from "@/lib/deliveryCoverage";

export async function evaluateDeliveryLocation(
  latitude: number,
  longitude: number
): Promise<DeliveryAvailability> {
  return evaluateStoredDeliveryLocation(latitude, longitude);
}
