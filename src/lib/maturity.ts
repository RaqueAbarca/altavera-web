export const MATURITY_OPTIONS = [
  { value: "green", label: "Verde / Más firme" },
  { value: "turning", label: "Punto medio" },
  { value: "ripe", label: "Maduro / listo para consumir" },
  { value: "mixed", label: "Mixto" },
] as const;

export type MaturityPreference =
  (typeof MATURITY_OPTIONS)[number]["value"];

export function isMaturityPreference(
  value: unknown
): value is MaturityPreference {
  return MATURITY_OPTIONS.some(
    (option) => option.value === value
  );
}

export function getMaturityLabel(
  value: string | null | undefined
) {
  if (!value) return null;

  return (
    MATURITY_OPTIONS.find(
      (option) => option.value === value
    )?.label ?? value
  );
}
