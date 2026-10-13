export type VariantCalculationMode = "weight" | "fraction" | "factor";

export type ProductSizeVariant = {
  id: string;
  label: string;
  calculationMode: VariantCalculationMode;
  calculationValue: number | null;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  referenceWeightKg: number | null;
  weightLabel: string;
  unitLabel: string;
  price: number | null;
  active: boolean;
};

function toPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function formatKg(value: number) {
  return new Intl.NumberFormat("es-CR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeCalculationMode(
  value: unknown,
  referenceWeightKg: number | null
): VariantCalculationMode {
  if (value === "weight" || value === "fraction" || value === "factor") {
    return value;
  }

  // Compatibilidad con las variantes creadas antes del sistema de presentaciones.
  if (referenceWeightKg !== null) return "weight";

  return "factor";
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

export function formatVariantDescriptor(variant: ProductSizeVariant) {
  if (variant.calculationMode === "weight") {
    return formatVariantWeightLabel(variant);
  }

  return variant.weightLabel.trim();
}

function roundPresentationPrice(value: number) {
  return Math.max(50, Math.round(value / 50) * 50);
}

export function calculateVariantPrice(
  basePrice: number,
  variant: Pick<
    ProductSizeVariant,
    "calculationMode" | "calculationValue" | "referenceWeightKg" | "price"
  >
) {
  const normalizedBasePrice = Number(basePrice);

  if (Number.isFinite(normalizedBasePrice) && normalizedBasePrice > 0) {
    if (variant.calculationMode === "weight") {
      const referenceWeightKg = toPositiveNumber(variant.referenceWeightKg);
      if (referenceWeightKg !== null) {
        return roundPresentationPrice(normalizedBasePrice * referenceWeightKg);
      }
    }

    if (variant.calculationMode === "fraction") {
      const divisor = toPositiveNumber(variant.calculationValue);
      if (divisor !== null) {
        return roundPresentationPrice(normalizedBasePrice / divisor);
      }
    }

    if (variant.calculationMode === "factor") {
      const factor = toPositiveNumber(variant.calculationValue);
      if (factor !== null) {
        return roundPresentationPrice(normalizedBasePrice * factor);
      }
    }
  }

  const legacyPrice = toPositiveNumber(variant.price);
  return legacyPrice;
}

export function normalizeProductSizeVariants(value: unknown): ProductSizeVariant[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const raw = entry as Record<string, unknown>;
    const id = cleanText(raw.id);
    const label = cleanText(raw.label);
    const minWeightKg = toPositiveNumber(raw.minWeightKg ?? raw.min_weight_kg);
    const maxWeightKg = toPositiveNumber(raw.maxWeightKg ?? raw.max_weight_kg);
    const referenceWeightKg = toPositiveNumber(
      raw.referenceWeightKg ?? raw.reference_weight_kg
    );
    const calculationMode = normalizeCalculationMode(
      raw.calculationMode ?? raw.calculation_mode,
      referenceWeightKg
    );
    const calculationValue = toPositiveNumber(
      raw.calculationValue ?? raw.calculation_value
    );
    const legacyWeightLabel = cleanText(raw.weightLabel ?? raw.weight_label);
    const unitLabel = cleanText(raw.unitLabel ?? raw.unit_label);
    const legacyPrice = toPositiveNumber(raw.price);
    const active = raw.active !== false;

    if (!id || !label) return [];

    const normalized: ProductSizeVariant = {
      id,
      label,
      calculationMode,
      calculationValue,
      minWeightKg,
      maxWeightKg,
      referenceWeightKg,
      weightLabel: legacyWeightLabel,
      unitLabel,
      price: legacyPrice,
      active,
    };

    if (calculationMode === "weight") {
      normalized.weightLabel = formatVariantWeightLabel(normalized);
    }

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

export function getVariantQuantityUnit(variant: ProductSizeVariant | null | undefined) {
  return cleanText(variant?.unitLabel) || "und";
}

export function getVariantPriceUnitLabel(variant: ProductSizeVariant | null | undefined) {
  const unit = getVariantQuantityUnit(variant).toLowerCase();
  if (unit === "und" || unit === "unidad" || unit === "unidades") return "unidad";
  return getVariantQuantityUnit(variant);
}

export function getVariantSelectorLabel(variants: ProductSizeVariant[]) {
  const active = variants.filter((variant) => variant.active !== false);
  if (active.length > 0 && active.every((variant) => variant.calculationMode === "weight")) {
    return "Tamaño";
  }
  return "Presentación";
}

export function formatVariantCalculationSummary(variant: ProductSizeVariant) {
  if (variant.calculationMode === "weight") {
    if (variant.referenceWeightKg === null) return "Completa el peso para precio";
    return `${formatKg(variant.referenceWeightKg)} kg × precio base`;
  }

  if (variant.calculationMode === "fraction") {
    if (variant.calculationValue === null) return "Completa el divisor";
    return `Precio base ÷ ${formatKg(variant.calculationValue)}`;
  }

  if (variant.calculationValue === null) return "Completa el factor";
  return `Precio base × ${formatKg(variant.calculationValue)}`;
}

export function formatVariantSnapshotName(
  productName: string,
  variant: ProductSizeVariant
) {
  const descriptor = formatVariantDescriptor(variant);

  return [productName, variant.label, descriptor]
    .filter(Boolean)
    .join(" · ");
}

export function hasWeightBasedVariants(variants: ProductSizeVariant[]) {
  return variants.some(
    (variant) => variant.active !== false && variant.calculationMode === "weight"
  );
}

export function getAutomaticVariantValidationError(variant: ProductSizeVariant) {
  if (variant.calculationMode === "weight") {
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

  if (variant.calculationValue === null) {
    return variant.calculationMode === "fraction"
      ? `Define entre cuánto se divide el precio base para ${variant.label}`
      : `Define el factor de precio para ${variant.label}`;
  }

  return null;
}
