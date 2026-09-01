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
      })),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ?? "No se pudo crear el pedido"
    );
  }

  return data as CreatedOrder;
}
