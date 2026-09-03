import type { CartItem } from "@/types/cart";
import type { CreatedOrder, OrderInput } from "./types";

type CreateOrderParams = {
  order: OrderInput;
  cart: CartItem[];
};

export async function createOrder({
  order,
  cart,
}: CreateOrderParams): Promise<CreatedOrder> {
  const response = await fetch("/api/orders/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order,
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        maturityPreference:
          item.maturity_selection_enabled
            ? item.maturity_preference ?? null
            : null,
      })),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.error ?? "No se pudo crear el pedido"
    ) as Error & { code?: string };
    error.code = data.code;
    throw error;
  }

  return data as CreatedOrder;
}
