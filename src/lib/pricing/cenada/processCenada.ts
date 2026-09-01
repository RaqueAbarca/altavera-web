import type {
  CenadaRow,
  ParsedProduct
} from "./types";

import { matchProduct } from "./matchProduct";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { saveCenadaPrice } from "./saveCenadaPrice";

export async function processCenada(
  rows:CenadaRow[]
){
  const results:ParsedProduct[]=[];

  for(
    const row of rows
  ){
    const parsed:ParsedProduct={
      bulletin:row,

      normalizedName:
        row.productName,

      matched:false,

      ignored:false,

      matchMethod:
        "unmatched"
    };

    const result=
      await matchProduct(
        parsed
      );

    if(result.ignored){
      results.push(
        result
      );

      continue;
    }

    if(
      result.matched&&
      result.productId
    ){
      await saveCenadaPrice(
        result.productId,
        row
      );

      results.push(
        result
      );

      continue;
    }

    /*
     * Producto CENADA todavía
     * no asociado.
     */
    const {
      error
    }=await supabaseAdmin
      .from(
        "cenada_pending_matches"
      )
      .insert({
        product_name:
          row.productName,

        unit:
          row.unit,

        minimum_price:
          row.minimumPrice,

        maximum_price:
          row.maximumPrice,

        mode_price:
          row.modePrice,

        average_price:
          row.averagePrice,

        bulletin_date:
          row.bulletinDate,

        bulletin_number:
          row.bulletinType,

        page:
          row.page,

        row:
          row.row,

        status:
          "pending"
      });

    /*
     * 23505:
     * ya existe.
     */
    if(
      error&&
      error.code!=="23505"
    ){
      throw error;
    }

    results.push(
      result
    );
  }

  return results;
}