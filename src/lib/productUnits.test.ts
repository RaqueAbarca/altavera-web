import { describe, expect, it } from "vitest";
import {
  formatProductEquivalence,
  isKilogramUnit,
} from "./productUnits";

describe("productUnits", () => {
  it("reconoce Kg y Kilo como unidades por peso", () => {
    expect(isKilogramUnit("Kg")).toBe(true);
    expect(isKilogramUnit("Kilo")).toBe(true);
  });

  it("muestra rangos de unidades por kg", () => {
    expect(formatProductEquivalence("Kg", 154, 5, 8)).toBe(
      "1 kg ≈ 5–8 unidades"
    );
  });

  it("invierte el rango para productos vendidos por unidad", () => {
    expect(formatProductEquivalence("Und", 400, 2, 3)).toBe(
      "1 unidad ≈ 0,33–0,5 kg"
    );
  });

  it("usa el peso promedio cuando no hay rango", () => {
    expect(formatProductEquivalence("Kilo", 250)).toBe(
      "1 kg ≈ 4 unidades"
    );
  });

  it("muestra el peso aproximado de un rollo", () => {
    expect(formatProductEquivalence("Rollo", 450)).toBe(
      "1 rollo ≈ 450 g"
    );
  });
});
