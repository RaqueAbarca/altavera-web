import { getProductPricingData } from "./getProductPricingData"
import { pricingEngine } from "../engine/pricingEngine"
import { supabaseAdmin } from "@/lib/supabaseAdmin"


export async function generateRecommendation(
  productId:number
){

  const {
    product,
    cenada,
    rule
  } = await getProductPricingData(productId)


  const result = pricingEngine({

    currentPrice:
      product.price ?? 0,

    cenadaPrice:
      cenada.price_per_unit,

    competitorPrice:
      null,

    rule

  })


  const {data,error}=await supabaseAdmin
    .from("price_recommendations")
    .insert({

      product_id:productId,

      run_id:null,

      current_price:
        product.price ?? 0,

      cenada_price:
        cenada.price_per_unit,

      competitor_price:null,

      minimum_price:
        result.minimumPrice,

      target_price:
        result.targetPrice,

      recommended_price:
        result.finalPrice,

      applied_margin:
        rule.minimum_margin,

      discount_used:
        rule.walmart_discount,

      status:"pending"

    })
    .select()
    .single();


  if(error){
    throw error;
  }


  return {
    product,
    result,
    recommendation:data
  }

}