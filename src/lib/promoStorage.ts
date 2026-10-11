export type StoredPromoCode = {
  code: string;
  label: string;
  discountType: "free_shipping";
};

const PROMO_STORAGE_KEY = "altavera:promo-code";

export function readStoredPromoCode(): StoredPromoCode | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(PROMO_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredPromoCode>;
    if (
      typeof parsed.code !== "string" ||
      !parsed.code ||
      typeof parsed.label !== "string" ||
      parsed.discountType !== "free_shipping"
    ) {
      window.sessionStorage.removeItem(PROMO_STORAGE_KEY);
      return null;
    }

    return {
      code: parsed.code,
      label: parsed.label,
      discountType: "free_shipping",
    };
  } catch {
    window.sessionStorage.removeItem(PROMO_STORAGE_KEY);
    return null;
  }
}

export function saveStoredPromoCode(promo: StoredPromoCode) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(promo));
  window.dispatchEvent(new CustomEvent("altavera:promo-change"));
}

export function clearStoredPromoCode() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PROMO_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("altavera:promo-change"));
}
