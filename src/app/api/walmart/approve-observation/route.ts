import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

    if(!Number.isInteger(competitorProductId)||competitorProductId<=0){
      return NextResponse.json(
        {error:"Producto Walmart inválido"},
        {status:400}
      );
    }

    const {data:product,error:productError}=await supabaseAdmin
      .from("competitor_products")
      .select(`
        id,
        validation_status,
        current_price,
        last_update_run_id
      `)
      .eq("id",competitorProductId)
      .maybeSingle();

    if(productError){
      throw productError;
    }

    if(!product){
      return NextResponse.json(
        {error:"El producto Walmart no existe"},
        {status:404}
      );
    }

    if(product.validation_status!=="suspicious_price"){
      return NextResponse.json(
        {
          error:
            product.validation_status==="presentation_changed"
              ?"La presentación cambió. Debe verificar la conversión, no solo aprobar el precio."
              :"Este producto no tiene un cambio de precio pendiente de aprobación."
        },
        {status:400}
      );
    }

    const now=new Date().toISOString();

    const {error:updateError}=await supabaseAdmin
      .from("competitor_products")
      .update({
        validation_status:"valid",
        validation_warning:null,
        last_valid_current_price:product.current_price,
        validation_reviewed_at:now,
        validation_reviewed_by:auth.user.id,
        updated_at:now
      })
      .eq("id",competitorProductId);

    if(updateError){
      throw updateError;
    }

    if(product.last_update_run_id){
      const {error:observationError}=await supabaseAdmin
        .from("competitor_product_observations")
        .update({
          validation_status:"valid",
          validation_warning:"Cambio de precio aprobado manualmente por un administrador.",
          reviewed_at:now,
          reviewed_by:auth.user.id
        })
        .eq("competitor_product_id",competitorProductId)
        .eq("update_run_id",product.last_update_run_id);

      if(observationError){
        throw observationError;
      }

      await syncWalmartPrices({
        updateRunId:product.last_update_run_id,
        competitorProductIds:[competitorProductId]
      });
    }

    return NextResponse.json({success:true});
  }catch(error){
    console.error("ERROR APROBANDO PRECIO WALMART:",error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error aprobando precio Walmart"
      },
      {status:500}
    );
  }
}
