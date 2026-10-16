import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { round, type Source } from "./model";

export async function getMoneySource(cycleId: string): Promise<Source> {
  type Order = { id: string; total: number; shipping: number; order_item: { id: string; product_id: number | null; product_name: string; quantity: number; unit: string | null }[] };
  const orders: Order[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabaseAdmin.from("orders")
      .select("id,total,shipping,order_item(id,product_id,product_name,quantity,unit)")
      .eq("delivery_cycle_id", cycleId).in("status", ["confirmed", "preparing", "ready", "delivered"])
      .order("id").range(offset, offset + 499);
    if (error) throw error;
    orders.push(...(data ?? []) as unknown as Order[]);
    if ((data?.length ?? 0) < 500) break;
  }
  const products = new Map<string, Source["products"][number]>();
  let revenue = 0, shipping = 0;
  for (const order of orders) {
    revenue += Number(order.total); shipping += Number(order.shipping ?? 0);
    order.order_item.sort((a, b) => a.id.localeCompare(b.id));
    for (const item of order.order_item) {
      const key = `${item.product_id ?? item.product_name}:${item.unit ?? "unidad"}`;
      const current = products.get(key) ?? { key, name: item.product_name, unit: item.unit ?? "unidad", quantity: 0 };
      current.quantity = round(current.quantity + Number(item.quantity));
      products.set(key, current);
    }
  }
  return { fingerprint: createHash("sha256").update(JSON.stringify(orders)).digest("hex"), revenue: round(revenue), shipping: round(shipping), count: orders.length, products: [...products.values()] };
}
