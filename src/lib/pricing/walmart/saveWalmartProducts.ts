import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  WalmartProduct,
  WalmartReference
} from "./types";
import {
  validateWalmartObservation,
  WalmartValidationStatus
} from "./validateWalmartObservation";

type ExistingProduct={
  id:number;
  external_id:string;
  raw_price:number|null;
  current_price:number|null;
  last_valid_current_price:number|null;
  measurement_unit:string|null;
  quantity_text:string|null;
  unit_multiplier:number|null;
};

type ValidationCounts={
  valid:number;
  suspicious:number;
  presentationChanged:number;
  noPrice:number;
};

function countStatus(
  counts:ValidationCounts,
  status:WalmartValidationStatus
){
  if(status==="valid") counts.valid++;
  if(status==="suspicious_price") counts.suspicious++;
  if(status==="presentation_changed") counts.presentationChanged++;
  if(status==="no_price") counts.noPrice++;
}

export async function saveWalmartProducts(
  products:WalmartProduct[],
  reference:WalmartReference,
  updateRunId:string
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

  const {data:existingRows,error:existingError}=
    await supabaseAdmin
      .from("competitor_products")
      .select(`
        id,
        external_id,
        raw_price,
        current_price,
        last_valid_current_price,
        measurement_unit,
        quantity_text,
        unit_multiplier
      `)
      .eq("competitor_id",competitor.id);

  if(existingError){
    throw existingError;
  }

  const existingByExternalId=
    new Map<string,ExistingProduct>(
      ((existingRows??[]) as ExistingProduct[])
        .map(row=>[String(row.external_id),row])
    );

  const now=new Date().toISOString();
  const validationByExternalId=
    new Map<string,ReturnType<typeof validateWalmartObservation>>();

  const rows=products.map(product=>{
    const previous=
      existingByExternalId.get(product.externalId)??null;

    const validation=
      validateWalmartObservation(
        product,
        previous
      );

    validationByExternalId.set(
      product.externalId,
      validation
    );

    return{
      competitor_id:competitor.id,
      external_id:product.externalId,
      name:product.name,
      raw_price:product.currentPrice,
      current_price:product.currentPrice,
      regular_price:product.regularPrice,
      discount_percent:product.discountPercent,
      previous_current_price:validation.previousPrice,
      last_valid_current_price:
        validation.status==="valid"
          ?product.currentPrice
          :previous?.last_valid_current_price??validation.previousPrice,
      price_change_percent:validation.priceChangePercent,
      validation_status:validation.status,
      validation_warning:validation.warning,
      presentation_signature:validation.presentationSignature,
      measurement_unit:product.measurementUnit,
      quantity_text:product.quantityText,
      unit_multiplier:product.unitMultiplier,
      reference_label:reference.label,
      reference_region_id:reference.regionId,
      reference_sellers:reference.sellers,
      selected_seller_id:product.selectedSellerId,
      selected_seller_name:product.selectedSellerName,
      last_update_run_id:updateRunId,
      raw_data:product.rawData,
      last_seen_at:now,
      updated_at:now
    };
  });

  const {data,error}=await supabaseAdmin
    .from("competitor_products")
    .upsert(
      rows,
      {
        onConflict:"competitor_id,external_id"
      }
    )
    .select("id,external_id");

  if(error){
    throw error;
  }

  const savedRows=(data??[]) as Array<{
    id:number;
    external_id:string;
  }>;

  const counts:ValidationCounts={
    valid:0,
    suspicious:0,
    presentationChanged:0,
    noPrice:0
  };

  const observations=savedRows.map(row=>{
    const product=
      products.find(item=>item.externalId===String(row.external_id));

    const validation=
      validationByExternalId.get(String(row.external_id));

    if(!product||!validation){
      throw new Error(
        `No se pudo reconstruir la observación Walmart ${row.external_id}`
      );
    }

    countStatus(counts,validation.status);

    return{
      competitor_product_id:row.id,
      update_run_id:updateRunId,
      observed_at:now,
      current_price:product.currentPrice,
      regular_price:product.regularPrice,
      discount_percent:product.discountPercent,
      measurement_unit:product.measurementUnit,
      quantity_text:product.quantityText,
      unit_multiplier:product.unitMultiplier,
      reference_label:reference.label,
      reference_region_id:reference.regionId,
      selected_seller_id:product.selectedSellerId,
      selected_seller_name:product.selectedSellerName,
      validation_status:validation.status,
      validation_warning:validation.warning,
      previous_current_price:validation.previousPrice,
      price_change_percent:validation.priceChangePercent
    };
  });

  if(observations.length>0){
    const {error:observationError}=await supabaseAdmin
      .from("competitor_product_observations")
      .upsert(
        observations,
        {
          onConflict:"competitor_product_id,update_run_id"
        }
      );

    if(observationError){
      throw observationError;
    }
  }

  const changedIds=savedRows
    .filter(row=>
      validationByExternalId.get(String(row.external_id))
        ?.status==="presentation_changed"
    )
    .map(row=>row.id);

  if(changedIds.length>0){
    const {error:resetError}=await supabaseAdmin
      .from("competitor_product_matches")
      .update({
        conversion_factor:null,
        verified:false,
        confidence:null,
        notes:"Walmart cambió la presentación; la conversión debe verificarse nuevamente.",
        updated_at:now
      })
      .eq("action","use")
      .in("competitor_product_id",changedIds);

    if(resetError){
      throw resetError;
    }
  }

  return{
    saved:savedRows.length,
    ...counts
  };
}
