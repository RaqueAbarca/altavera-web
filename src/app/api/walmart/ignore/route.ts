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

    if(
      !Number.isInteger(competitorProductId)||
      competitorProductId<=0
    ){
      return NextResponse.json(
        {
          error:"ID de producto Walmart inválido"
        },
        {
          status:400
        }
      );
    }

    const {data:product,error:productError}=
      await supabaseAdmin
        .from("competitor_products")
        .select("id,name")
        .eq("id",competitorProductId)
        .maybeSingle();

    if(productError) throw productError;

    if(!product){
      return NextResponse.json(
        {
          error:"El producto de Walmart no existe"
        },
        {
          status:404
        }
      );
    }

    const {error}=await supabaseAdmin
      .from("competitor_product_matches")
      .upsert(
        {
          competitor_product_id:competitorProductId,
          product_id:null,
          action:"ignore",
          priority:1,
          conversion_factor:null,
          verified:false,
          notes:"Ignorado manualmente desde panel Walmart",
          updated_at:new Date().toISOString()
        },
        {
          onConflict:"competitor_product_id"
        }
      );

    if(error) throw error;

    return NextResponse.json({
      success:true,
      productName:product.name
    });
  }catch(error){
    console.error(
      "ERROR IGNORANDO PRODUCTO WALMART:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error ignorando producto Walmart"
      },
      {
        status:500
      }
    );
  }
}