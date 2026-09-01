import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function assignWalmartProduct(
  competitorProductId:number,
  productId:number
){
  const {data:competitorProduct,error:productError}=
    await supabaseAdmin
      .from("competitor_products")
      .select("id,name")
      .eq("id",competitorProductId)
      .maybeSingle();

  if(productError) throw productError;

  if(!competitorProduct){
    throw new Error("El producto de Walmart no existe");
  }

  const {error}=await supabaseAdmin
    .from("competitor_product_matches")
    .upsert(
      {
        competitor_product_id:competitorProductId,
        product_id:productId,
        action:"use",
        priority:1,
        conversion_factor:null,
        verified:false,
        notes:"Asignado manualmente desde panel Walmart",
        updated_at:new Date().toISOString()
      },
      {
        onConflict:"competitor_product_id"
      }
    );

  if(error) throw error;

  return true;
}