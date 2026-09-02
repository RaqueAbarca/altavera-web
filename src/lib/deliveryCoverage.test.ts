import { describe, expect, it } from "vitest";
import { evaluatePublicCoverage } from "./deliveryCoverage";

describe("delivery coverage", () => {
  it.each([
    ["Alajuela", 10.01625, -84.21163],
    ["Heredia", 9.998, -84.116],
    ["Belén", 9.98, -84.18],
    ["Santa Bárbara", 10.04, -84.16],
    ["San Isidro", 10.03, -84.05],
    ["Tibás", 9.962, -84.078],
    ["Moravia", 9.96164, -84.0488],
    ["Escazú", 9.92, -84.14],
    ["Santa Ana", 9.935, -84.19],
    ["San Pablo", 10.003, -84.09],
    ["Barva", 10.04, -84.12],
    ["San Rafael", 10.05, -84.085],
    ["Pavas / Rohrmoser", 9.945, -84.13],
    ["La Sabana", 9.936, -84.1],
  ])("accepts a representative point in %s", (_, lat, lng) => {
    expect(
      evaluatePublicCoverage(lat, lng).available
    ).toBe(true);
  });

  it.each([
    ["Sarapiquí de Alajuela", 10.3, -84.18],
    ["Vara Blanca", 10.17, -84.1],
    ["Cartago", 9.86, -83.92],
  ])("rejects %s", (_, lat, lng) => {
    expect(
      evaluatePublicCoverage(lat, lng).available
    ).toBe(false);
  });
});
