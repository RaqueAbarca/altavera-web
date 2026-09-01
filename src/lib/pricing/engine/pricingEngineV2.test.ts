import {
  describe,
  expect,
  it
} from "vitest";

import {
  pricingEngineV2
} from "./pricingEngineV2";

describe(
  "pricingEngineV2 - V2.4",
  ()=>{
    it(
      "usa margen normal de 30% cuando no existe Walmart",
      ()=>{
        const result=
          pricingEngineV2({
            cenadaCost:700,
            currentPrice:1000,
            competitorPrice:null
          });

        expect(
          result.minimumPrice
        ).toBe(
          1000
        );

        expect(
          result.recommendedPrice
        ).toBe(
          1000
        );

        expect(
          result.minimumMarginUsed
        ).toBe(
          0.3
        );

        expect(
          result.competitiveExceptionApplied
        ).toBe(
          false
        );

        expect(
          result.requiresReview
        ).toBe(
          true
        );

        expect(
          result.appliedMargin
        ).toBe(
          0.3
        );
      }
    );

    it(
      "resuelve correctamente el caso del Chayote tierno quelite",
      ()=>{
        const result=
          pricingEngineV2({
            cenadaCost:147.06,
            currentPrice:250,
            competitorPrice:230
          });

        expect(
          result.minimumPrice
        ).toBe(
          220
        );

        expect(
          result.targetPrice
        ).toBe(
          210
        );

        expect(
          result.competitiveExceptionApplied
        ).toBe(
          false
        );

        expect(
          result.minimumAllowedPrice
        ).toBe(
          220
        );

        expect(
          result.recommendedPrice
        ).toBe(
          220
        );

        expect(
          result.appliedMargin
        ).toBe(
          0.3315
        );

        expect(
          result.discountUsed
        ).toBe(
          0.0435
        );
      }
    );

    it(
      "recomienda hasta 10% debajo de Walmart cuando el margen lo permite",
      ()=>{
        const result=
          pricingEngineV2({
            cenadaCost:500,
            currentPrice:null,
            competitorPrice:1000
          });

        expect(
          result.minimumPrice
        ).toBe(
          720
        );

        expect(
          result.targetPrice
        ).toBe(
          900
        );

        expect(
          result.recommendedPrice
        ).toBe(
          900
        );

        expect(
          result.discountUsed
        ).toBe(
          0.1
        );

        expect(
          result.competitiveExceptionApplied
        ).toBe(
          false
        );
      }
    );

    it(
      "nunca permite voluntariamente más de 10% de descuento contra Walmart",
      ()=>{
        const result=
          pricingEngineV2({
            cenadaCost:500,
            currentPrice:null,
            competitorPrice:1000,

            /*
             * Incluso si una regla vieja
             * intentara enviar 20%.
             */
            targetDiscount:0.20
          });

        expect(
          result.targetPrice
        ).toBe(
          900
        );

        expect(
          result.recommendedPrice
        ).toBe(
          900
        );

        expect(
          result.discountUsed
        ).toBe(
          0.1
        );
      }
    );

    it(
      "activa la excepción competitiva cuando Walmart está debajo del piso normal",
      ()=>{
        const result=
          pricingEngineV2({
            cenadaCost:700,
            currentPrice:null,
            competitorPrice:980
          });

        expect(
          result.minimumPrice
        ).toBe(
          1000
        );

        expect(
          result.competitiveMinimumPrice
        ).toBe(
          880
        );

        expect(
          result.competitiveExceptionApplied
        ).toBe(
          true
        );

        expect(
          result.minimumMarginUsed
        ).toBe(
          0.2
        );

        expect(
          result.targetPrice
        ).toBe(
          890
        );

        expect(
          result.recommendedPrice
        ).toBe(
          890
        );

        expect(
          result.requiresReview
        ).toBe(
          true
        );

        expect(
          result.appliedMargin
        ).toBeGreaterThanOrEqual(
          0.2
        );
      }
    );

    it(
      "prioriza el piso competitivo cuando ni 10% debajo de Walmart es sostenible",
      ()=>{
        const result=
          pricingEngineV2({
            cenadaCost:700,
            currentPrice:null,
            competitorPrice:800
          });

        expect(
          result.competitiveExceptionApplied
        ).toBe(
          true
        );

        expect(
          result.competitiveMinimumPrice
        ).toBe(
          880
        );

        expect(
          result.targetPrice
        ).toBe(
          720
        );

        expect(
          result.minimumAllowedPrice
        ).toBe(
          880
        );

        expect(
          result.recommendedPrice
        ).toBe(
          880
        );

        expect(
          result.discountUsed
        ).toBe(
          0
        );

        expect(
          result.requiresReview
        ).toBe(
          true
        );
      }
    );

    it(
    "mantiene el precio actual cuando el cambio es menor a 5% y sigue siendo seguro",
    ()=>{
        const result=
        pricingEngineV2({
            cenadaCost:700,
            currentPrice:1120,
            competitorPrice:1200
        });

        expect(
        result.calculatedPrice
        ).toBe(
        1080
        );

        expect(
        result.priceChangePercent
        ).toBeLessThan(
        0.05
        );

        expect(
        result.minimumAllowedPrice
        ).toBe(
        1080
        );

        expect(
        result.recommendedPrice
        ).toBe(
        1120
        );

        expect(
        result.stabilityApplied
        ).toBe(
        true
        );
    }
    );

    it(
    "no deja que la estabilidad mantenga un precio debajo del mínimo comercial",
    ()=>{
        const result=
        pricingEngineV2({
            cenadaCost:700,
            currentPrice:1050,
            competitorPrice:1200
        });

        expect(
        result.calculatedPrice
        ).toBe(
        1080
        );

        expect(
        result.priceChangePercent
        ).toBeLessThan(
        0.05
        );

        expect(
        result.minimumAllowedPrice
        ).toBe(
        1080
        );

        expect(
        result.recommendedPrice
        ).toBe(
        1080
        );

        expect(
        result.stabilityApplied
        ).toBe(
        false
        );
    }
    );

    it(
    "redondea en múltiplos de 10 para precios menores a 2000",
    ()=>{
        const result=
        pricingEngineV2({
            cenadaCost:810,
            currentPrice:null,
            competitorPrice:null
        });

        expect(
        result.minimumPrice
        ).toBe(
        1160
        );

        expect(
        result.minimumPrice%10
        ).toBe(
        0
        );
    }
    );

    it(
    "redondea en múltiplos de 50 para precios de 2000 o más",
    ()=>{
        const result=
        pricingEngineV2({
            cenadaCost:1410,
            currentPrice:null,
            competitorPrice:null
        });

        expect(
        result.minimumPrice
        ).toBe(
        2050
        );

        expect(
        result.minimumPrice%50
        ).toBe(
        0
        );
    }
    );

    it(
      "rechaza un costo CENADA inválido",
      ()=>{
        expect(
          ()=>{
            pricingEngineV2({
              cenadaCost:0,
              currentPrice:1000,
              competitorPrice:null
            });
          }
        ).toThrow(
          "El costo CENADA debe ser mayor a 0"
        );
      }
    );
  }
);