import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { pricingEngineV2 } from "@/lib/pricing/engine/pricingEngineV2";
import { saveCenadaPrice } from "./saveCenadaPrice";

import type {
  CenadaBulletinType,
  CenadaRow
} from "./types";

type CreateDraftInput={
  pendingId:number;
  name:string;
  category:string;
  unit:string;
  conversionFactor:number;
  description?:string;
  imageUrl?:string;
};

type PricingRule={
  category:string|null;
  minimum_margin:number;
  competitive_minimum_margin:number;
  walmart_discount:number;
  walmart_fallback_discount:number;
  price_change_threshold:number;
  competitor_max_age_days:number;
  enabled:boolean;
};

function normalize(value:string|null|undefined){
  return value?.trim().toLowerCase()??"";
}

function isCenadaBulletinType(
  value:string
):value is CenadaBulletinType{
  return(
    value==="plaza"||
    value==="fruta_importada"||
    value==="aromaticos_gourmet"
  );
}

function getRule(
  rules:PricingRule[],
  category:string
){
  const categoryRule=
    rules.find(
      rule=>
        rule.category!==null&&
        normalize(rule.category)===
        normalize(category)
    );

  if(categoryRule){
    return categoryRule;
  }

  const generalRule=
    rules.find(
      rule=>
        rule.category===null||
        normalize(rule.category)===""
    );

  if(generalRule){
    return generalRule;
  }

  if(rules[0]){
    return rules[0];
  }

  return{
    category:null,
    minimum_margin:0.30,
    competitive_minimum_margin:0.20,
    walmart_discount:0.10,
    walmart_fallback_discount:0.10,
    price_change_threshold:0.05,
    competitor_max_age_days:7,
    enabled:true
  };
}

export async function createDraftProductFromCenada(
  input:CreateDraftInput
){
  const name=input.name.trim();
  const category=input.category.trim();
  const unit=input.unit.trim();
  const description=input.description?.trim()??"";
  const imageUrl=input.imageUrl?.trim()||"/logo.svg";
  const conversionFactor=Number(input.conversionFactor);

  if(!name){
    throw new Error("El nombre del producto es obligatorio");
  }

  if(!category){
    throw new Error("Seleccione una categoría");
  }

  if(!unit){
    throw new Error("La unidad de venta es obligatoria");
  }

  if(
    !Number.isFinite(conversionFactor)||
    conversionFactor<=0
  ){
    throw new Error("El factor de conversión debe ser mayor a 0");
  }

  const {
    data:pending,
    error:pendingError
  }=await supabaseAdmin
    .from("cenada_pending_matches")
    .select(`
      id,
      product_name,
      unit,
      minimum_price,
      maximum_price,
      mode_price,
      average_price,
      bulletin_date,
      bulletin_number,
      page,
      row,
      status
    `)
    .eq("id",input.pendingId)
    .maybeSingle();

  if(pendingError){
    throw pendingError;
  }

  if(!pending){
    throw new Error("El producto pendiente de CENADA no existe");
  }

  if(pending.status!=="pending"){
    throw new Error("Este producto CENADA ya fue procesado");
  }

  if(
    !isCenadaBulletinType(
      pending.bulletin_number
    )
  ){
    throw new Error(
      `Tipo de boletín CENADA no válido: ${pending.bulletin_number}`
    );
  }

  const sourceUnit=
    pending.unit?.trim();

  if(!sourceUnit){
    throw new Error("El producto CENADA no tiene una unidad de origen válida");
  }

  const cenadaCost=
    Math.round(
      (
        Number(pending.mode_price)/
        conversionFactor
      )*
      100
    )/100;

  if(
    !Number.isFinite(cenadaCost)||
    cenadaCost<=0
  ){
    throw new Error("No se pudo calcular un costo CENADA válido");
  }

  const {
    data:existingProduct,
    error:existingProductError
  }=await supabaseAdmin
    .from("products")
    .select("id,name")
    .ilike("name",name)
    .limit(1)
    .maybeSingle();

  if(existingProductError){
    throw existingProductError;
  }

  if(existingProduct){
    throw new Error(
      `Ya existe un producto llamado ${existingProduct.name}. Asígnelo al producto existente en lugar de crear otro.`
    );
  }

  const {
    data:rules,
    error:rulesError
  }=await supabaseAdmin
    .from("pricing_rules")
    .select(`
      category,
      minimum_margin,
      competitive_minimum_margin,
      walmart_discount,
      walmart_fallback_discount,
      price_change_threshold,
      competitor_max_age_days,
      enabled
    `)
    .eq("enabled",true);

  if(rulesError){
    throw rulesError;
  }

  const rule=
    getRule(
      (rules??[]) as PricingRule[],
      category
    );

  const pricing=
    pricingEngineV2({
      cenadaCost,
      currentPrice:null,
      competitorPrice:null,
      minimumMargin:Number(rule.minimum_margin),
      competitiveMinimumMargin:Number(
        rule.competitive_minimum_margin
      ),
      targetDiscount:Number(rule.walmart_discount),
      fallbackDiscount:Number(
        rule.walmart_fallback_discount
      ),
      wasteRate:0,
      packagingCost:0,
      handlingCost:0,
      otherVariableCost:0,
      roundingIncrement:50,
      priceChangeThreshold:Number(
        rule.price_change_threshold
      ),
      applyStabilityThreshold:false
    });

  const {
    data:product,
    error:productError
  }=await supabaseAdmin
    .from("products")
    .insert({
      name,
      description,
      category,
      price:pricing.recommendedPrice,
      unit,
      image_url:imageUrl,
      featured:false,
      is_active:false
    })
    .select(`
      id,
      name,
      category,
      price,
      unit,
      description,
      image_url,
      is_active
    `)
    .single();

  if(productError){
    throw productError;
  }

  const productId=Number(product.id);

  try{
    const {
      error:conversionError
    }=await supabaseAdmin
      .from("product_unit_conversions")
      .insert({
        product_id:productId,
        source:"cenada",
        source_unit:sourceUnit,
        target_unit:unit,
        conversion_factor:conversionFactor,
        verified:true
      });

    if(conversionError){
      throw conversionError;
    }

    const normalizedName=
      normalize(pending.product_name);

    const {
      data:existingMapping,
      error:mappingSearchError
    }=await supabaseAdmin
      .from("cenada_product_mappings")
      .select("id")
      .eq("normalized_name",normalizedName)
      .maybeSingle();

    if(mappingSearchError){
      throw mappingSearchError;
    }

    if(existingMapping){
      const {error}=await supabaseAdmin
        .from("cenada_product_mappings")
        .update({
          cenada_name:pending.product_name,
          product_id:productId,
          action:"use",
          priority:1,
          notes:"Producto nuevo creado desde panel CENADA",
          updated_at:new Date().toISOString()
        })
        .eq("id",existingMapping.id);

      if(error){
        throw error;
      }
    }else{
      const {error}=await supabaseAdmin
        .from("cenada_product_mappings")
        .insert({
          cenada_name:pending.product_name,
          product_id:productId,
          action:"use",
          priority:1,
          notes:"Producto nuevo creado desde panel CENADA"
        });

      if(error){
        throw error;
      }
    }

    const {
      data:existingAlias,
      error:aliasSearchError
    }=await supabaseAdmin
      .from("product_aliases")
      .select("id")
      .eq("product_id",productId)
      .eq("source","cenada")
      .eq("alias",pending.product_name)
      .maybeSingle();

    if(aliasSearchError){
      throw aliasSearchError;
    }

    if(!existingAlias){
      const {error}=await supabaseAdmin
        .from("product_aliases")
        .insert({
          product_id:productId,
          alias:pending.product_name,
          source:"cenada"
        });

      if(error){
        throw error;
      }
    }

    const row:CenadaRow={
      source:"cenada",
      bulletinType:pending.bulletin_number,
      bulletinDate:pending.bulletin_date,
      plazaDate:pending.bulletin_date,
      productName:pending.product_name,
      unit:sourceUnit,
      minimumPrice:Number(pending.minimum_price),
      maximumPrice:Number(pending.maximum_price),
      modePrice:Number(pending.mode_price),
      averagePrice:Number(pending.average_price),
      page:Number(pending.page),
      row:Number(pending.row)
    };

    await saveCenadaPrice(
      productId,
      row
    );

    const {
      error:pendingUpdateError
    }=await supabaseAdmin
      .from("cenada_pending_matches")
      .update({
        status:"matched"
      })
      .eq("id",pending.id);

    if(pendingUpdateError){
      throw pendingUpdateError;
    }

    return{
      product:{
        ...product,
        id:productId,
        price:Number(product.price)
      },
      pricing:{
        cenadaCost:pricing.cenadaCost,
        suggestedPrice:pricing.recommendedPrice,
        minimumPrice:pricing.minimumPrice,
        appliedMargin:pricing.appliedMargin,
        competitorPrice:pricing.competitorPrice,
        reason:pricing.reason
      }
    };

  }catch(error){
    /*
     * El producto todavía es borrador y no es visible.
     * Si una operación secundaria falla, intentamos
     * retirar las relaciones creadas y luego el borrador
     * para no dejar un alta a medias.
     */
    await supabaseAdmin
      .from("cenada_prices")
      .delete()
      .eq("product_id",productId);

    await supabaseAdmin
      .from("product_aliases")
      .delete()
      .eq("product_id",productId);

    await supabaseAdmin
      .from("product_unit_conversions")
      .delete()
      .eq("product_id",productId);

    await supabaseAdmin
      .from("cenada_product_mappings")
      .delete()
      .eq("product_id",productId);

    await supabaseAdmin
      .from("products")
      .delete()
      .eq("id",productId);

    throw error;
  }
}
