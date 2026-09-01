import { supabaseAdmin } from "@/lib/supabaseAdmin";

import type {
  CenadaRow
} from "./types";

export async function saveCenadaPrice(
  productId:number,
  row:CenadaRow
){
  const bulletinDate=
    row.bulletinDate;

  if(!bulletinDate){
    throw new Error(
      "La fecha del boletín CENADA no es válida"
    );
  }

  const sourceUnit=
    row.unit?.trim()||
    null;

  let targetUnit:string|null=
    null;

  let conversionFactor:number|null=
    null;

  let pricePerUnit:number|null=
    null;

  /*
   * Conversión:
   *
   * producto
   * + source cenada
   * + presentación original
   */
  if(sourceUnit){
    const {
      data:conversion,
      error:conversionError
    }=await supabaseAdmin
      .from(
        "product_unit_conversions"
      )
      .select(
        `
        target_unit,
        conversion_factor
        `
      )
      .eq(
        "product_id",
        productId
      )
      .eq(
        "source",
        "cenada"
      )
      .eq(
        "source_unit",
        sourceUnit
      )
      .eq(
        "verified",
        true
      )
      .maybeSingle();

    if(conversionError){
      throw conversionError;
    }

    if(conversion){
      const factor=
        Number(
          conversion
            .conversion_factor
        );

      if(
        !Number.isFinite(
          factor
        )||
        factor<=0
      ){
        throw new Error(
          `Factor de conversión inválido para ${row.productName}`
        );
      }

      targetUnit=
        conversion.target_unit;

      conversionFactor=
        factor;

      pricePerUnit=
        Math.round(
          (
            Number(
              row.modePrice
            )/
            factor
          )*
          100
        )/
        100;
    }
  }

  const {
    data,
    error
  }=await supabaseAdmin
    .from(
      "cenada_prices"
    )
    .insert({
      product_id:
        productId,

      date:
        bulletinDate,

      /*
       * Este campo conserva su nombre
       * histórico, pero ahora contiene
       * el tipo real del boletín.
       */
      bulletin_number:
        row.bulletinType,

      minimum_price:
        row.minimumPrice,

      maximum_price:
        row.maximumPrice,

      mode_price:
        row.modePrice,

      average_price:
        row.averagePrice,

      cenada_name:
        row.productName,

      cenada_unit:
        sourceUnit,

      unit:
        targetUnit,

      conversion_factor:
        conversionFactor,

      price_per_unit:
        pricePerUnit
    })
    .select()
    .single();

  /*
   * PDF repetido.
   */
  if(
    error?.code==="23505"
  ){
    return null;
  }

  if(error){
    throw error;
  }

  return data;
}