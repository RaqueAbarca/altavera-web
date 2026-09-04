import { describe, expect, it } from "vitest";
import { evaluatePublicCoverage } from "./deliveryCoverage";

describe("delivery coverage", () => {
  it("accepts a representative point in Alajuela", () => {
    expect(
      evaluatePublicCoverage(10.01625, -84.21163).available
    ).toBe(true);
  });

  it.each([
    ["Sarapiquí de Alajuela", 10.3, -84.18],
    ["Heredia", 9.998, -84.116],
    ["Belén", 9.98, -84.18],
    ["Tibás", 9.962, -84.078],
    ["Moravia", 9.96164, -84.0488],
    ["Escazú", 9.92, -84.14],
    ["Santa Ana", 9.935, -84.19],
    ["Cartago", 9.86, -83.92],
  ])("rejects %s", (_, lat, lng) => {
    expect(
      evaluatePublicCoverage(lat, lng).available
    ).toBe(false);
  });
});
