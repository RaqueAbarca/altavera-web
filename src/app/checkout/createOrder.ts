import { supabase } from "@/lib/supabase";
import type { GuestOrder } from "./types";
import type { CartItem } from "@/types/cart";

type CreateOrderParams = {
  order: GuestOrder;
  cart: CartItem[];
};

export async function createOrder({
  order,
  cart,
}: CreateOrderParams) {

    const { data: sessionData } = await supabase.auth.getSession();

    console.log(
    "SESSION DESDE WEB:",
    sessionData.session
    );

  const { data: createdOrder, error } = await supabase
    .from("orders")
    .insert(order)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const item = cart.map((item) => ({
    order_id: createdOrder.id,
    product_id: item.id,
    product_name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const { error: itemError } = await supabase
    .from("order_item")
    .insert(item);

  if (itemError) {
    throw itemError;
  }

  return createdOrder;
}