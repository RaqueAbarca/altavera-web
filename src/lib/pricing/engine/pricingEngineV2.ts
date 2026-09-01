export type PricingEngineV2Input={
  cenadaCost:number;
  currentPrice:number|null;
  competitorPrice:number|null;
  minimumMargin?:number;
  competitiveMinimumMargin?:number;
  targetDiscount?:number;

  /*
   * Campo legado.
   * V2.3 ya no utiliza un segundo descuento.
   */
  fallbackDiscount?:number;

  wasteRate?:number;
  packagingCost?:number;
  handlingCost?:number;
  otherVariableCost?:number;

  /*
   * Incremento estándar para precios mayores.
   * Por defecto ₡50.
   *
   * V2.3 usa automáticamente ₡10
   * para precios menores a ₡1.000.
   */
  roundingIncrement?:number;

  priceChangeThreshold?:number;
  applyStabilityThreshold?:boolean;
};

export type PricingEngineV2Result={
  cenadaCost:number;
  effectiveCost:number;
  currentPrice:number|null;
  competitorPrice:number|null;

  minimumMargin:number;
  competitiveMinimumMargin:number;

  minimumPrice:number;
  competitiveMinimumPrice:number;
  minimumAllowedPrice:number;
  minimumMarginUsed:number;

  targetPrice:number|null;

  /*
   * Campo legado.
   */
  fallbackTargetPrice:number|null;

  calculatedPrice:number;
  recommendedPrice:number;

  priceChangePercent:number|null;
  stabilityApplied:boolean;

  appliedMargin:number;
  discountUsed:number|null;

  competitiveExceptionApplied:boolean;
  requiresReview:boolean;
  reason:string;
};

function roundMoney(
  value:number
){
  return Math.round(
    value*100
  )/100;
}

function roundRatio(
  value:number
){
  return Math.round(
    value*10000
  )/10000;
}

function getRoundingIncrement(
  value:number,
  standardIncrement:number
){
  /*
   * V2.3
   *
   * En productos baratos, ₡50 representa
   * una proporción demasiado grande del precio.
   *
   * Menos de ₡1.000:
   * múltiplos de ₡10.
   *
   * ₡1.000 o más:
   * utilizamos el incremento estándar,
   * normalmente ₡50.
   */
  if(
    value<2000
  ){
    return 10;
  }

  if(
    standardIncrement<=0
  ){
    return 0;
  }

  return standardIncrement;
}

function roundUpAdaptive(
  value:number,
  standardIncrement:number
){
  /*
   * JavaScript puede producir errores mínimos
   * de punto flotante.
   *
   * Ejemplo:
   * 700 / 0.70 puede terminar internamente como
   * 1000.0000000000001.
   *
   * Sin esta normalización, Math.ceil()
   * lo llevaría incorrectamente a ₡1.050.
   */
    const roundedToCents=
      Math.round(
        value*100
      )/100;

    const normalizedValue=
      Math.abs(
        value-
        roundedToCents
      )<=1e-9
        ?roundedToCents
        :value;

    const increment=
      getRoundingIncrement(
        normalizedValue,
        standardIncrement
      );

    if(
      increment<=0
    ){
      return roundMoney(
        normalizedValue
      );
    }

    return Math.ceil(
      normalizedValue/
      increment
    )*increment;
  }

export function pricingEngineV2(
  input:PricingEngineV2Input
):PricingEngineV2Result{
  const {
    cenadaCost,
    currentPrice,
    competitorPrice,

    minimumMargin=0.30,
    competitiveMinimumMargin=0.20,

    targetDiscount=0.10,

    wasteRate=0,
    packagingCost=0,
    handlingCost=0,
    otherVariableCost=0,

    roundingIncrement=50,
    priceChangeThreshold=0.05,
    applyStabilityThreshold=true
  }=input;

  if(
    !Number.isFinite(
      cenadaCost
    )||
    cenadaCost<=0
  ){
    throw new Error(
      "El costo CENADA debe ser mayor a 0"
    );
  }

  if(
    minimumMargin<0||
    minimumMargin>=1
  ){
    throw new Error(
      "El margen mínimo debe estar entre 0 y 1"
    );
  }

  if(
    competitiveMinimumMargin<0||
    competitiveMinimumMargin>=1
  ){
    throw new Error(
      "El margen competitivo mínimo debe estar entre 0 y 1"
    );
  }

  if(
    competitiveMinimumMargin>
    minimumMargin
  ){
    throw new Error(
      "El margen competitivo no puede ser mayor al margen normal"
    );
  }

  if(
    wasteRate<0||
    wasteRate>=1
  ){
    throw new Error(
      "La merma debe estar entre 0 y 1"
    );
  }

  if(
    priceChangeThreshold<0||
    priceChangeThreshold>=1
  ){
    throw new Error(
      "El umbral de cambio debe estar entre 0 y 1"
    );
  }

  if(
    targetDiscount<0||
    targetDiscount>=1
  ){
    throw new Error(
      "El descuento Walmart debe estar entre 0 y 1"
    );
  }

  /*
   * Regla comercial:
   * descuento máximo frente a Walmart = 10%.
   *
   * La protección existe incluso si
   * pricing_rules tuviera accidentalmente
   * un porcentaje superior.
   */
  const maximumWalmartDiscount=
    0.10;

  const effectiveTargetDiscount=
    Math.min(
      targetDiscount,
      maximumWalmartDiscount
    );

  const costAfterWaste=
    cenadaCost/
    (1-wasteRate);

  const effectiveCost=
    roundMoney(
      costAfterWaste+
      packagingCost+
      handlingCost+
      otherVariableCost
    );

  /*
   * Piso normal.
   *
   * El valor matemático se redondea:
   *
   * < ₡1.000 → ₡10
   * >= ₡1.000 → ₡50
   */
  const rawMinimumPrice=
    effectiveCost/
    (1-minimumMargin);

  const minimumPrice=
    roundUpAdaptive(
      rawMinimumPrice,
      roundingIncrement
    );

  /*
   * Piso excepcional competitivo.
   */
  const rawCompetitiveMinimumPrice=
    effectiveCost/
    (
      1-
      competitiveMinimumMargin
    );

  const competitiveMinimumPrice=
    roundUpAdaptive(
      rawCompetitiveMinimumPrice,
      roundingIncrement
    );

  const hasCompetitor=
    competitorPrice!==null&&
    Number.isFinite(
      competitorPrice
    )&&
    Number(
      competitorPrice
    )>0;

  const walmartPrice=
    hasCompetitor
      ?Number(
          competitorPrice
        )
      :null;

  /*
   * Solo existe excepción competitiva
   * cuando Walmart realmente queda por
   * debajo del piso normal de Altavera.
   */
  const competitiveExceptionApplied=
    walmartPrice!==null&&
    walmartPrice<
    minimumPrice;

  const marginFloor=
    competitiveExceptionApplied
      ?competitiveMinimumPrice
      :minimumPrice;

  const minimumMarginUsed=
    competitiveExceptionApplied
      ?competitiveMinimumMargin
      :minimumMargin;

  /*
   * Precio objetivo:
   * máximo 10% debajo de Walmart.
   *
   * También usa redondeo adaptativo.
   */
  const rawTargetPrice=
    walmartPrice!==null
      ?walmartPrice*
        (
          1-
          effectiveTargetDiscount
        )
      :null;

  const targetPrice=
    rawTargetPrice!==null
      ?roundUpAdaptive(
          rawTargetPrice,
          roundingIncrement
        )
      :null;

  const fallbackTargetPrice:
    number|null=
      null;

  /*
   * Mínimo comercial absoluto:
   *
   * - nunca romper el margen aplicable
   * - nunca quedar más de 10% debajo
   *   de Walmart
   */
  const minimumAllowedPrice=
    targetPrice!==null
      ?Math.max(
          marginFloor,
          targetPrice
        )
      :marginFloor;

  let recommendedPrice=
    minimumAllowedPrice;

  let requiresReview=
    false;

  let reason="";

  if(
    walmartPrice!==null
  ){
    /*
     * CASO NORMAL
     */
    if(
      !competitiveExceptionApplied
    ){
      if(
        targetPrice!==null&&
        targetPrice>=
        minimumPrice
      ){
        recommendedPrice=
          targetPrice;

        reason=
          "Se recomienda aproximadamente 10% debajo de Walmart manteniendo el margen normal.";

      }else{
        recommendedPrice=
          minimumPrice;

        if(
          recommendedPrice<
          walmartPrice
        ){
          reason=
            "No es posible aplicar el 10% completo sin romper el margen normal; se utiliza un descuento menor frente a Walmart.";

        }else if(
          recommendedPrice===
          walmartPrice
        ){
          reason=
            "No es posible aplicar descuento sin romper el margen normal; se recomienda aproximadamente igualar Walmart.";

        }else{
          reason=
            "El precio mínimo necesario para conservar el margen normal es superior al precio de Walmart.";
        }
      }

    /*
     * EXCEPCIÓN COMPETITIVA
     */
    }else{
      requiresReview=
        true;

      if(
        targetPrice!==null&&
        targetPrice>=
        competitiveMinimumPrice
      ){
        recommendedPrice=
          targetPrice;

        reason=
          "Excepción competitiva: Walmart está por debajo del mínimo normal. Se recomienda aproximadamente 10% debajo de Walmart conservando al menos el margen competitivo.";

      }else{
        recommendedPrice=
          competitiveMinimumPrice;

        if(
          recommendedPrice<
          walmartPrice
        ){
          reason=
            "Excepción competitiva: aplicar 10% de descuento rompería el margen competitivo; se utiliza un descuento menor frente a Walmart.";

        }else if(
          recommendedPrice===
          walmartPrice
        ){
          reason=
            "Excepción competitiva: no es viable aplicar descuento; se recomienda aproximadamente igualar Walmart para conservar el margen competitivo.";

        }else{
          reason=
            "Excepción competitiva: ni siquiera igualar Walmart permite conservar el margen competitivo mínimo. Se recomienda el piso de seguridad, superior a Walmart, y se requiere revisión manual.";
        }
      }
    }

  }else{
    recommendedPrice=
      minimumPrice;

    requiresReview=
      true;

    reason=
      "No existe una referencia Walmart válida; se utiliza provisionalmente el precio mínimo que conserva el margen normal.";
  }

  /*
   * Protección matemática.
   */
  recommendedPrice=
    Math.max(
      recommendedPrice,
      minimumAllowedPrice
    );

  recommendedPrice=
    roundUpAdaptive(
      recommendedPrice,
      roundingIncrement
    );

  /*
   * Resultado antes de estabilidad.
   */
  const calculatedPrice=
    recommendedPrice;

  let priceChangePercent:
    number|null=
      null;

  let stabilityApplied=
    false;

  const hasCurrentPrice=
    currentPrice!==null&&
    Number.isFinite(
      currentPrice
    )&&
    Number(
      currentPrice
    )>0;

  if(
    hasCurrentPrice
  ){
    const numericCurrentPrice=
      Number(
        currentPrice
      );

    priceChangePercent=
      Math.abs(
        calculatedPrice-
        numericCurrentPrice
      )/
      numericCurrentPrice;

    /*
     * El precio actual solamente puede
     * mantenerse si sigue respetando el
     * piso comercial completo.
     */
    const currentPriceIsAllowed=
      numericCurrentPrice>=
      minimumAllowedPrice;

    if(
      applyStabilityThreshold&&
      priceChangePercent<
      priceChangeThreshold&&
      currentPriceIsAllowed
    ){
      recommendedPrice=
        numericCurrentPrice;

      stabilityApplied=
        true;

      const changePercent=
        (
          priceChangePercent*
          100
        ).toFixed(2);

      const thresholdPercent=
        (
          priceChangeThreshold*
          100
        ).toFixed(0);

      reason=
        `${reason} Cambio de ${changePercent}% menor al umbral de ${thresholdPercent}%; se mantiene el precio actual.`;
    }
  }

  /*
   * Protección final.
   */
  if(
    recommendedPrice<
    minimumAllowedPrice
  ){
    recommendedPrice=
      minimumAllowedPrice;

    stabilityApplied=
      false;
  }

  const appliedMargin=
    roundRatio(
      (
        recommendedPrice-
        effectiveCost
      )/
      recommendedPrice
    );

  const discountUsed=
    walmartPrice!==null
      ?roundRatio(
          Math.max(
            0,
            1-
            recommendedPrice/
            walmartPrice
          )
        )
      :null;

  return{
    cenadaCost:
      roundMoney(
        cenadaCost
      ),

    effectiveCost,

    currentPrice,

    competitorPrice:
      walmartPrice,

    minimumMargin:
      roundRatio(
        minimumMargin
      ),

    competitiveMinimumMargin:
      roundRatio(
        competitiveMinimumMargin
      ),

    minimumPrice,

    competitiveMinimumPrice,

    minimumAllowedPrice,

    minimumMarginUsed:
      roundRatio(
        minimumMarginUsed
      ),

    targetPrice,

    fallbackTargetPrice,

    calculatedPrice,

    recommendedPrice,

    priceChangePercent:
      priceChangePercent===null
        ?null
        :roundRatio(
            priceChangePercent
          ),

    stabilityApplied,

    appliedMargin,

    discountUsed,

    competitiveExceptionApplied,

    requiresReview,

    reason
  };
}