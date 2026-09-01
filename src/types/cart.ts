import { Product } from "./product";
import type { MaturityPreference } from "@/lib/maturity";

export interface CartItem extends Product {
  quantity: number;
  maturity_preference?: MaturityPreference | null;
}
