import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ParsedProduct } from "./types";

function normalizeName(value:string){
  return value.trim().toLowerCase();
}

export async function matchProduct(
  product:ParsedProduct
):Promise<ParsedProduct>{

  const normalizedName=
    normalizeName(product.normalizedName);

  /*
   * 1. Buscar primero en el nuevo sistema
   * de mappings de CENADA.
   */
  const {
    data:mapping,
    error:mappingError
  }=await supabaseAdmin
    .from("cenada_product_mappings")
    .select(`
      product_id,
      action,
      priority
    `)
    .eq("normalized_name",normalizedName)
    .maybeSingle();

  if(mappingError){
    throw mappingError;
  }

  /*
   * Producto conocido pero decidido
   * explícitamente como ignorado.
   */
  if(mapping?.action==="ignore"){
    return{
      ...product,
      normalizedName,
      matched:false,
      ignored:true,
      matchMethod:"ignored"
    };
  }

  /*
   * Producto conocido y asociado
   * a un producto del catálogo Altavera.
   */
  if(
    mapping?.action==="use"&&
    mapping.product_id
  ){
    return{
      ...product,
      normalizedName,
      productId:mapping.product_id,
      matched:true,
      ignored:false,
      priority:mapping.priority??1,
      matchMethod:"mapping"
    };
  }

  /*
   * 2. Fallback temporal a product_aliases.
   *
   * Lo dejamos por compatibilidad mientras
   * terminamos la migración del sistema viejo.
   */
  const {
    data:alias,
    error:aliasError
  }=await supabaseAdmin
    .from("product_aliases")
    .select("product_id")
    .eq("source","cenada")
    .ilike(
      "alias",
      product.normalizedName.trim()
    )
    .maybeSingle();

  if(aliasError){
    throw aliasError;
  }

  if(alias?.product_id){
    return{
      ...product,
      normalizedName,
      productId:alias.product_id,
      matched:true,
      ignored:false,
      priority:1,
      matchMethod:"alias"
    };
  }

  return{
    ...product,
    normalizedName,
    matched:false,
    ignored:false,
    matchMethod:"unmatched"
  };
}