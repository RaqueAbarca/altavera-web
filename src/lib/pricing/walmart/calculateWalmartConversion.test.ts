import {describe,expect,it} from "vitest";
import {calculateWalmartConversion} from "./calculateWalmartConversion";

describe("calculateWalmartConversion",()=>{
  it("trata Ajo 1x3 como un paquete de tres, no como una unidad individual",()=>{
    const result=calculateWalmartConversion({
      walmartName:"Ajo Malla 3 Uds",
      measurementUnit:"un",
      quantityText:"3 Uds",
      altaveraName:"Ajo (1x3)",
      altaveraUnit:"Und"
    });

    expect(result?.factor).toBe(1);
  });

  it("mantiene la conversion por unidad para un pack Walmart cuando Altavera vende una unidad",()=>{
    const result=calculateWalmartConversion({
      walmartName:"Limón Hortifruti Mandarino - 8 Uds",
      measurementUnit:"un",
      quantityText:"8 Uds",
      altaveraName:"Limón mandarina",
      altaveraUnit:"Und"
    });

    expect(result?.factor).toBe(8);
  });

  it("puede leer un peso objetivo desde el nombre Altavera",()=>{
    const result=calculateWalmartConversion({
      walmartName:"Ajo Trenza Hortifruti Kilo",
      measurementUnit:"un",
      quantityText:"1 kg",
      altaveraName:"Ajo (500 gramos)",
      altaveraUnit:"Und"
    });

    expect(result?.factor).toBe(2);
  });
});
