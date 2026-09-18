import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { WalmartReference } from "./types";

export type WalmartUpdateRunCounts={
  downloaded:number;
  saved:number;
  valid:number;
  suspicious:number;
  presentationChanged:number;
  noPrice:number;
  pricesSaved:number;
};

export async function startWalmartUpdateRun(){
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
    throw new Error("No existe un competidor Walmart habilitado");
  }

  const id=randomUUID();
  const startedAt=new Date().toISOString();

  const {error}=await supabaseAdmin
    .from("competitor_update_runs")
    .insert({
      id,
      competitor_id:competitor.id,
      status:"running",
      started_at:startedAt
    });

  if(error){
    throw error;
  }

  return{
    id,
    competitorId:Number(competitor.id),
    startedAt
  };
}

export async function finishWalmartUpdateRun(input:{
  id:string;
  reference:WalmartReference;
  counts:WalmartUpdateRunCounts;
}){
  const {error}=await supabaseAdmin
    .from("competitor_update_runs")
    .update({
      status:"success",
      finished_at:new Date().toISOString(),
      reference_label:input.reference.label,
      reference_region_id:input.reference.regionId,
      reference_sellers:input.reference.sellers,
      downloaded_count:input.counts.downloaded,
      saved_count:input.counts.saved,
      valid_count:input.counts.valid,
      suspicious_count:input.counts.suspicious,
      presentation_changed_count:input.counts.presentationChanged,
      no_price_count:input.counts.noPrice,
      prices_saved_count:input.counts.pricesSaved,
      error:null
    })
    .eq("id",input.id);

  if(error){
    throw error;
  }
}

export async function failWalmartUpdateRun(
  id:string,
  errorMessage:string
){
  await supabaseAdmin
    .from("competitor_update_runs")
    .update({
      status:"failed",
      finished_at:new Date().toISOString(),
      error:errorMessage.slice(0,2000)
    })
    .eq("id",id);
}
