import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime="nodejs";

export async function GET(){
  const auth=await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const {data:walmartCompetitor,error:walmartCompetitorError}=await supabaseAdmin
      .from("competitors")
      .select("id")
      .eq("name","Walmart")
      .eq("enabled",true)
      .maybeSingle();

    if(walmartCompetitorError){
      throw walmartCompetitorError;
    }

    if(!walmartCompetitor){
      return NextResponse.json(
        {error:"No existe un competidor Walmart habilitado"},
        {status:404}
      );
    }

    const {data:latestRun,error:latestRunError}=await supabaseAdmin
      .from("competitor_update_runs")
      .select("id")
      .eq("competitor_id",walmartCompetitor.id)
      .eq("status","success")
      .not("reference_region_id","is",null)
      .order("started_at",{ascending:false})
      .limit(1)
      .maybeSingle();

    if(latestRunError){
      throw latestRunError;
    }

    const [productsResult,walmartResult]=await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id,name,unit")
        .order("name"),
      latestRun
        ?supabaseAdmin
          .from("competitor_products")
          .select(`
            id,
            external_id,
            name,
            raw_price,
            current_price,
            regular_price,
            discount_percent,
            previous_current_price,
            price_change_percent,
            validation_status,
            validation_warning,
            reference_label,
            reference_region_id,
            selected_seller_id,
            selected_seller_name,
            measurement_unit,
            quantity_text,
            unit_multiplier,
            last_seen_at
          `)
          .eq("competitor_id",walmartCompetitor.id)
          .eq("last_update_run_id",latestRun.id)
          .order("name")
        :Promise.resolve({data:[],error:null})
    ]);

    if(productsResult.error){
      throw productsResult.error;
    }

    if(walmartResult.error){
      throw walmartResult.error;
    }

    const walmartProducts=walmartResult.data??[];
    const activeIds=walmartProducts.map(item=>item.id);
    let matches:unknown[]=[];

    if(activeIds.length>0){
      const {data:matchesData,error:matchesError}=await supabaseAdmin
        .from("competitor_product_matches")
        .select(`
          competitor_product_id,
          product_id,
          action,
          verified,
          conversion_factor
        `)
        .in("competitor_product_id",activeIds);

      if(matchesError){
        throw matchesError;
      }

      matches=matchesData??[];
    }

    return NextResponse.json({
      competitorId:walmartCompetitor.id,
      latestRunId:latestRun?.id??null,
      products:productsResult.data??[],
      walmartProducts,
      matches
    });
  }catch(error){
    console.error("ERROR CARGANDO DATOS ADMIN WALMART:",error);

    const message=
      error&&typeof error==="object"&&"message" in error
        ?String((error as {message?:unknown}).message??"Error cargando Walmart")
        :error instanceof Error
          ?error.message
          :"Error cargando Walmart";

    return NextResponse.json({error:message},{status:500});
  }
}
