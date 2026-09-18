import { describe,expect,it } from "vitest";
import { validateWalmartObservation } from "./validateWalmartObservation";
import type { WalmartProduct } from "./types";

function product(overrides:Partial<WalmartProduct>={}):WalmartProduct{
  return{
    externalId:"1",
    name:"Aguacate Hass Kilo",
    price:2100,
    currentPrice:2100,
    regularPrice:2100,
    discountPercent:0,
    measurementUnit:"kg",
    quantityText:"1 kg",
    unitMultiplier:1,
    selectedSellerId:"seller-1",
    selectedSellerName:"Walmart",
    rawData:{productId:"1",productName:"Aguacate Hass Kilo"},
    ...overrides
  };
}

const previous={
  current_price:2000,
  raw_price:2000,
  last_valid_current_price:2000,
  measurement_unit:"kg",
  quantity_text:"1 kg",
  unit_multiplier:1
};

describe("validateWalmartObservation",()=>{
  it("acepta un cambio normal de precio",()=>{
    const result=validateWalmartObservation(product(),previous);
    expect(result.status).toBe("valid");
    expect(result.priceChangePercent).toBe(5);
  });

  it("bloquea un cambio mayor al umbral",()=>{
    const result=validateWalmartObservation(
      product({price:3100,currentPrice:3100,regularPrice:3100}),
      previous
    );
    expect(result.status).toBe("suspicious_price");
    expect(result.priceChangePercent).toBe(55);
  });

  it("compara contra el último precio válido y no contra un valor sospechoso previo",()=>{
    const result=validateWalmartObservation(
      product({price:3100,currentPrice:3100,regularPrice:3100}),
      {...previous,current_price:3100,raw_price:3100,last_valid_current_price:2000}
    );
    expect(result.status).toBe("suspicious_price");
    expect(result.previousPrice).toBe(2000);
  });

  it("bloquea cambios de presentación",()=>{
    const result=validateWalmartObservation(
      product({quantityText:"500 g",unitMultiplier:0.5}),
      previous
    );
    expect(result.status).toBe("presentation_changed");
  });

  it("bloquea productos sin precio actual",()=>{
    const result=validateWalmartObservation(
      product({price:null,currentPrice:null,regularPrice:null}),
      previous
    );
    expect(result.status).toBe("no_price");
  });
});
