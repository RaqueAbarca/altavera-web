export type ProductSizeVariant = {
  id: string;
  label: string;
  weightLabel: string;
  price: number;
  active: boolean;
};

export function normalizeProductSizeVariants(value: unknown): ProductSizeVariant[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const raw = entry as Record<string, unknown>;
    const id = String(raw.id ?? "").trim();
    const label = String(raw.label ?? "").trim();
    const weightLabel = String(raw.weightLabel ?? raw.weight_label ?? "").trim();
    const price = Number(raw.price);
    const active = raw.active !== false;

    if (!id || !label || !Number.isFinite(price) || price < 0) return [];

    return [{ id, label, weightLabel, price, active }];
  });
}

export function getActiveProductSizeVariants(value: unknown) {
  return normalizeProductSizeVariants(value).filter((variant) => variant.active);
}

export function findProductSizeVariant(value: unknown, variantId: string | null | undefined) {
  if (!variantId) return null;
  return normalizeProductSizeVariants(value).find((variant) => variant.id === variantId) ?? null;
}

export function formatVariantSnapshotName(
  productName: string,
  variant: Pick<ProductSizeVariant, "label" | "weightLabel">
) {
  return [productName, variant.label, variant.weightLabel]
    .filter(Boolean)
    .join(" · ");
}
