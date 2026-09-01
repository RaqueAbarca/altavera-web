import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { WalmartProduct } from "./types";

export async function saveWalmartProducts(
  products:WalmartProduct[]
){
  const {data:competitor,error:competitorError}=
    await supabaseAdmin
      .from("competitors")
      .select("id")
      .eq("name","Walmart")
      .eq("enabled",true)
      .maybeSingle();

  if(competitorError){
    throw competitorError;
  }

  if(!competitor){
    throw new Error(
      "No existe un competidor Walmart habilitado"
    );
  }

  const now=new Date().toISOString();

  const rows=products.map(product=>({
    competitor_id:competitor.id,
    external_id:product.externalId,
    name:product.name,
    raw_price:product.price,
    measurement_unit:product.measurementUnit,
    quantity_text:product.quantityText,
    unit_multiplier:product.unitMultiplier,
    raw_data:product.rawData,
    last_seen_at:now,
    updated_at:now
  }));

  const {data,error}=await supabaseAdmin
    .from("competitor_products")
    .upsert(
      rows,
      {
        onConflict:"competitor_id,external_id"
      }
    )
    .select("id");

  if(error){
    throw error;
  }

  return{
    saved:data?.length??0
  };
}