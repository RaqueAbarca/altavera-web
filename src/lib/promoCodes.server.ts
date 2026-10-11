import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type PromoDiscountType = "free_shipping";

type PromoRow = {
  id: string;
  code: string;
  label: string | null;
  discount_type: PromoDiscountType;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
};

export type PromoValidation = {
  valid: boolean;
  promo: PromoRow | null;
};

export type PromoClaim = {
  id: string;
  code: string;
  discountType: PromoDiscountType;
};

export function normalizePromoCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 40);
}

export async function validatePromoCode(value: unknown): Promise<PromoValidation> {
  const code = normalizePromoCode(value);
  if (!code) return { valid: false, promo: null };

  const { data, error } = await supabaseAdmin
    .from("promo_codes")
    .select("id,code,label,discount_type,is_active,starts_at,expires_at,max_uses,use_count")
    .eq("code", code)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { valid: false, promo: null };

  const promo = data as PromoRow;
  const now = Date.now();
  const startsAt = promo.starts_at ? new Date(promo.starts_at).getTime() : null;
  const expiresAt = promo.expires_at ? new Date(promo.expires_at).getTime() : null;
  const available =
    promo.is_active &&
    (startsAt === null || startsAt <= now) &&
    (expiresAt === null || expiresAt > now) &&
    (promo.max_uses === null || promo.use_count < promo.max_uses) &&
    promo.discount_type === "free_shipping";

  return { valid: available, promo: available ? promo : null };
}

export async function claimPromoCode(value: unknown): Promise<PromoClaim | null> {
  const code = normalizePromoCode(value);
  if (!code) return null;

  const { data, error } = await supabaseAdmin.rpc("altavera_claim_promo_code", {
    p_code: code,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    id: String(row.promo_id),
    code: String(row.promo_code),
    discountType: String(row.discount_type) as PromoDiscountType,
  };
}

export async function releasePromoCode(promoId: string) {
  const { error } = await supabaseAdmin.rpc("altavera_release_promo_code", {
    p_promo_id: promoId,
  });

  if (error) {
    console.error("ERROR LIBERANDO CÓDIGO PROMOCIONAL:", error);
  }
}
