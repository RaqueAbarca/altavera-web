export type ProductSizeVariant = {
  id: string;
  label: string;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  referenceWeightKg: number | null;
  weightLabel: string;
  price: number | null;
  active: boolean;
};

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatKg(value: number) {
  return new Intl.NumberFormat("es-CR", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatVariantWeightLabel(
  variant: Pick<ProductSizeVariant, "minWeightKg" | "maxWeightKg" | "weightLabel">
) {
  const min = toPositiveNumber(variant.minWeightKg);
  const max = toPositiveNumber(variant.maxWeightKg);

  if (min !== null && max !== null) {
    if (Math.abs(min - max) < 0.001) {
      return `${formatKg(min)} kg aprox.`;
    }

    return `${formatKg(Math.min(min, max))}–${formatKg(Math.max(min, max))} kg aprox.`;
  }

  return variant.weightLabel.trim();
}

export function calculateVariantPrice(
  basePricePerKg: number,
  variant: Pick<ProductSizeVariant, "referenceWeightKg" | "price">
) {
  const basePrice = Number(basePricePerKg);
  const referenceWeightKg = toPositiveNumber(variant.referenceWeightKg);

  if (Number.isFinite(basePrice) && basePrice > 0 && referenceWeightKg !== null) {
    const rawPrice = basePrice * referenceWeightKg;
    return Math.max(50, Math.round(rawPrice / 50) * 50);
  }

  const legacyPrice = toPositiveNumber(variant.price);
  return legacyPrice;
}

export function normalizeProductSizeVariants(value: unknown): ProductSizeVariant[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const raw = entry as Record<string, unknown>;
    const id = String(raw.id ?? "").trim();
    const label = String(raw.label ?? "").trim();
    const minWeightKg = toPositiveNumber(raw.minWeightKg ?? raw.min_weight_kg);
    const maxWeightKg = toPositiveNumber(raw.maxWeightKg ?? raw.max_weight_kg);
    const referenceWeightKg = toPositiveNumber(
      raw.referenceWeightKg ?? raw.reference_weight_kg
    );
    const legacyWeightLabel = String(raw.weightLabel ?? raw.weight_label ?? "").trim();
    const legacyPrice = toPositiveNumber(raw.price);
    const active = raw.active !== false;

    if (!id || !label) return [];

    const normalized: ProductSizeVariant = {
      id,
      label,
      minWeightKg,
      maxWeightKg,
      referenceWeightKg,
      weightLabel: legacyWeightLabel,
      price: legacyPrice,
      active,
    };

    normalized.weightLabel = formatVariantWeightLabel(normalized);
    return [normalized];
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
  variant: Pick<ProductSizeVariant, "label" | "minWeightKg" | "maxWeightKg" | "weightLabel">
) {
  const weightLabel = formatVariantWeightLabel(variant);

  return [productName, variant.label, weightLabel]
    .filter(Boolean)
    .join(" · ");
}

export function getAutomaticVariantValidationError(
  variant: ProductSizeVariant
) {
  if (variant.minWeightKg === null || variant.maxWeightKg === null) {
    return `Completa el rango de peso de ${variant.label}`;
  }

  if (variant.minWeightKg > variant.maxWeightKg) {
    return `El peso mínimo de ${variant.label} no puede superar el máximo`;
  }

  if (variant.referenceWeightKg === null) {
    return `Define el peso de referencia para calcular el precio de ${variant.label}`;
  }

  if (
    variant.referenceWeightKg < variant.minWeightKg ||
    variant.referenceWeightKg > variant.maxWeightKg
  ) {
    return `El peso de referencia de ${variant.label} debe quedar dentro de su rango`;
  }

  return null;
}
