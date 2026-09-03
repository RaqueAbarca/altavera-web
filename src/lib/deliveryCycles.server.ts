import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function syncDeliveryCycles() {
  const { error } = await supabaseAdmin.rpc(
    "altavera_finalize_delivery_cycles"
  );

  if (error) {
    throw error;
  }
}
