import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export const runtime="nodejs";

export async function POST(request:Request){
  const auth=await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const body=await request.json();

    const competitorProductId=
      Number(body.competitorProductId);

    const conversionFactor=
      Number(body.conversionFactor);

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
        {
          error:"Datos de conversión inválidos"
        },
        {
          status:400
        }
      );
    }

    const {data:match,error:matchError}=
      await supabaseAdmin
        .from("competitor_product_matches")
        .select(`
          id,
          action,
          product_id
        `)
        .eq(
          "competitor_product_id",
          competitorProductId
        )
        .maybeSingle();

    if(matchError){
      throw matchError;
    }

    if(!match||match.action!=="use"){
      return NextResponse.json(
        {
          error:"El producto Walmart no está asociado a Altavera"
        },
        {
          status:400
        }
      );
    }

    const {error:updateError}=
      await supabaseAdmin
        .from("competitor_product_matches")
        .update({
          conversion_factor:conversionFactor,
          verified:true,
          confidence,
          updated_at:new Date().toISOString()
        })
        .eq("id",match.id);

    if(updateError){
      throw updateError;
    }

    return NextResponse.json({
      success:true
    });
  }catch(error){
    console.error(
      "ERROR VERIFICANDO CONVERSIÓN WALMART:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error verificando conversión Walmart"
      },
      {
        status:500
      }
    );
  }
}