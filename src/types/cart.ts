import { Product } from "./product";
import type { MaturityPreference } from "@/lib/maturity";

export interface CartItem extends Product {
  quantity: number;
  maturity_preference?: MaturityPreference | null;
  variant_id?: string | null;
  variant_label?: string | null;
  variant_weight_label?: string | null;
}
