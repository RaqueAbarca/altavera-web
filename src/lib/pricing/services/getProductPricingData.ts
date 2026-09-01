import { supabase } from "@/lib/supabase"

export async function getProductPricingData(
  productId:number
){

  const { data:product, error:productError } =
    await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single()


  if(productError){
    throw productError
  }


  const { data:cenada, error:cenadaError } =
    await supabase
      .from("cenada_prices")
      .select("*")
      .eq("product_id", productId)
      .order("date", {
        ascending:false
      })
      .limit(1)
      .single()


  if(cenadaError){
    throw cenadaError
  }


  const { data:rule, error:ruleError } =
    await supabase
      .from("pricing_rules")
      .select("*")
      .eq("category", product.category)
      .single()


  if(ruleError){
    throw ruleError
  }


  return {
    product,
    cenada,
    rule
  }
}