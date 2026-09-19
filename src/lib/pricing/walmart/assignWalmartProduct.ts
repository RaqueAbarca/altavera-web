import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function assignWalmartProduct(
  competitorProductId:number,
  productId:number
){
  const {data:competitorProduct,error:productError}=
    await supabaseAdmin
      .from("competitor_products")
      .select("id,name,competitor_id")
      .eq("id",competitorProductId)
      .maybeSingle();

  if(productError) throw productError;

  if(!competitorProduct){
    throw new Error("El producto de Walmart no existe");
  }

  const {data:existingMatches,error:existingMatchesError}=
    await supabaseAdmin
      .from("competitor_product_matches")
      .select(`
        id,
        competitor_product_id,
        competitor_products!inner(competitor_id)
      `)
      .eq("product_id",productId)
      .eq("action","use")
      .eq(
        "competitor_products.competitor_id",
        competitorProduct.competitor_id
      );

  if(existingMatchesError) throw existingMatchesError;

  const existingMatchRows=(existingMatches??[]) as unknown as Array<{
    id:number;
    competitor_product_id:number;
  }>;

  const replacedIds=existingMatchRows
    .filter(match=>
      match.competitor_product_id!==competitorProductId
    )
    .map(match=>match.id);

  if(replacedIds.length>0){
    const {error:replaceError}=await supabaseAdmin
      .from("competitor_product_matches")
      .update({
        product_id:null,
        action:"ignore",
        conversion_factor:null,
        verified:false,
        confidence:null,
        notes:"Referencia reemplazada por otra presentación Walmart para el mismo producto Altavera.",
        updated_at:new Date().toISOString()
      })
      .in("id",replacedIds);

    if(replaceError) throw replaceError;
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