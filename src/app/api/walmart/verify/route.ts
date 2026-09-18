import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { syncWalmartPrices } from "@/lib/pricing/walmart/syncWalmartPrices";

export const runtime="nodejs";

export async function POST(request:Request){
  const auth=await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const body=await request.json();
    const competitorProductId=Number(body.competitorProductId);
    const conversionFactor=Number(body.conversionFactor);

    const confidence=
      body.confidence==="estimated"
        ?"estimated"
        :body.confidence==="measured"
          ?"measured"
          :"exact";

    if(
      !Number.isInteger(competitorProductId)||
      competitorProductId<=0||
      !Number.isFinite(conversionFactor)||
      conversionFactor<=0
    ){
      return NextResponse.json(
        {error:"Datos de conversión inválidos"},
        {status:400}
      );
    }

    const {data:match,error:matchError}=await supabaseAdmin
      .from("competitor_product_matches")
      .select(`
        id,
        action,
        product_id,
        competitor_products(
          validation_status,
          current_price,
          last_update_run_id
        )
      `)
      .eq("competitor_product_id",competitorProductId)
      .maybeSingle();

    if(matchError){
      throw matchError;
    }

    if(!match||match.action!=="use"){
      return NextResponse.json(
        {error:"El producto Walmart no está asociado a Altavera"},
        {status:400}
      );
    }

    const walmart=(match as unknown as {
      competitor_products:{
        validation_status:string|null;
        current_price:number|null;
        last_update_run_id:string|null;
      }|null;
    }).competitor_products;

    const now=new Date().toISOString();

    const {error:updateError}=await supabaseAdmin
      .from("competitor_product_matches")
      .update({
        conversion_factor:conversionFactor,
        verified:true,
        confidence,
        notes:`Conversión verificada manualmente. Factor ${conversionFactor}.`,
        updated_at:now
      })
      .eq("id",match.id);

    if(updateError){
      throw updateError;
    }

    if(walmart?.validation_status==="presentation_changed"){
      const {error:productError}=await supabaseAdmin
        .from("competitor_products")
        .update({
          validation_status:"valid",
          validation_warning:null,
          last_valid_current_price:walmart.current_price,
          validation_reviewed_at:now,
          validation_reviewed_by:auth.user.id,
          updated_at:now
        })
        .eq("id",competitorProductId);

      if(productError){
        throw productError;
      }

      if(walmart.last_update_run_id){
        const {error:observationError}=await supabaseAdmin
          .from("competitor_product_observations")
          .update({
            validation_status:"valid",
            validation_warning:"Nueva presentación revisada y conversión verificada manualmente.",
            reviewed_at:now,
            reviewed_by:auth.user.id
          })
          .eq("competitor_product_id",competitorProductId)
          .eq("update_run_id",walmart.last_update_run_id);

        if(observationError){
          throw observationError;
        }
      }
    }

    if(walmart?.last_update_run_id){
      await syncWalmartPrices({
        updateRunId:walmart.last_update_run_id,
        competitorProductIds:[competitorProductId]
      });
    }

    return NextResponse.json({success:true});
  }catch(error){
    console.error("ERROR VERIFICANDO CONVERSIÓN WALMART:",error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error verificando conversión Walmart"
      },
      {status:500}
    );
  }
}
