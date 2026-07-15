import { supabase } from "@/lib/supabase";
import type { OrderInput } from "./types";
import type { CartItem } from "@/types/cart";

type CreateOrderParams = {
  order: OrderInput;
  cart: CartItem[];
};

export async function createOrder({
  order,
  cart,
}: CreateOrderParams) {

  const {
    data: { user },
  } = await supabase.auth.getUser();


  const orderData: OrderInput = {

    ...order,

    customer_id: user?.id ?? null,

  };


  const { data: createdOrder, error } = await supabase
    .from("orders")
    .insert(orderData)
    .select("id")
    .single();


  if (error) {
    throw error;
  }


  const items = cart.map((item) => ({

    order_id: createdOrder.id,
    product_id: item.id,
    product_name: item.name,
    price: item.price,
    quantity: item.quantity,

  }));


  const { error: itemError } = await supabase
    .from("order_item")
    .insert(items);


  if (itemError) {
    throw itemError;
  }


  return createdOrder;

}