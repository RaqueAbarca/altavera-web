function normalizeUnit(unit: string) {
  return unit.trim().toLowerCase();
}

function formatDecimal(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("es-CR", {
    maximumFractionDigits,
  }).format(value);
}

function toPositiveNumber(value?: number | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeUnitsPerKgRange(
  minValue?: number | null,
  maxValue?: number | null
) {
  const min = toPositiveNumber(minValue);
  const max = toPositiveNumber(maxValue);

  if (min === null && max === null) {
    return null;
  }

  if (min !== null && max !== null) {
    return {
      min: Math.min(min, max),
      max: Math.max(min, max),
    };
  }

  const onlyValue = min ?? max;

  return onlyValue === null
    ? null
    : {
        min: onlyValue,
        max: onlyValue,
      };
}

export function isKilogramUnit(unit: string) {
  const normalizedUnit = normalizeUnit(unit);

  return (
    normalizedUnit === "kg" ||
    normalizedUnit === "kilo" ||
    normalizedUnit === "kilogramo" ||
    normalizedUnit === "kilogramos"
  );
}

function isSingleUnit(unit: string) {
  const normalizedUnit = normalizeUnit(unit);

  return (
    normalizedUnit === "und" ||
    normalizedUnit === "unidad" ||
    normalizedUnit === "unidades" ||
    normalizedUnit === "ud"
  );
}

function isRollUnit(unit: string) {
  return normalizeUnit(unit) === "rollo";
}

function formatUnitsPerKgRange(min: number, max: number) {
  if (Math.abs(max - min) < 0.01) {
    const digits = min >= 10 ? 0 : 1;
    const amount = formatDecimal(min, digits);
    return `${amount} ${Math.abs(min - 1) < 0.01 ? "unidad" : "unidades"}`;
  }

  const minDigits = min >= 10 ? 0 : 1;
  const maxDigits = max >= 10 ? 0 : 1;

  return `${formatDecimal(min, minDigits)}–${formatDecimal(
    max,
    maxDigits
  )} unidades`;
}

function formatKgPerUnitRange(unitsPerKgMin: number, unitsPerKgMax: number) {
  const kgMin = 1 / unitsPerKgMax;
  const kgMax = 1 / unitsPerKgMin;

  if (Math.abs(kgMax - kgMin) < 0.005) {
    return `${formatDecimal(kgMin, 2)} kg`;
  }

  return `${formatDecimal(kgMin, 2)}–${formatDecimal(kgMax, 2)} kg`;
}

export function formatProductEquivalence(
  unit: string,
  averageUnitWeightGrams?: number | null,
  unitsPerKgMin?: number | null,
  unitsPerKgMax?: number | null
) {
  const range = normalizeUnitsPerKgRange(unitsPerKgMin, unitsPerKgMax);

  if (range) {
    if (isKilogramUnit(unit)) {
      return `1 kg ≈ ${formatUnitsPerKgRange(range.min, range.max)}`;
    }

    if (isSingleUnit(unit)) {
      return `1 unidad ≈ ${formatKgPerUnitRange(range.min, range.max)}`;
    }
  }

  const grams = toPositiveNumber(averageUnitWeightGrams);

  if (grams === null) {
    return null;
  }

  if (isKilogramUnit(unit)) {
    const unitsPerKg = 1000 / grams;
    const digits = unitsPerKg >= 10 ? 0 : 1;

    return `1 kg ≈ ${formatDecimal(unitsPerKg, digits)} ${
      Math.abs(unitsPerKg - 1) < 0.05 ? "unidad" : "unidades"
    }`;
  }

  if (isSingleUnit(unit)) {
    const kilogramsPerUnit = grams / 1000;
    return `1 unidad ≈ ${formatDecimal(kilogramsPerUnit, 2)} kg`;
  }

  if (isRollUnit(unit)) {
    return `1 rollo ≈ ${formatDecimal(grams, 0)} g`;
  }

  return null;
}
