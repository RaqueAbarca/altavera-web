import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime="nodejs";

export async function POST(request:Request){
  const auth=await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const body=await request.json();
    const productId=Number(body.productId);
    const price=Number(body.price);
    const description=String(body.description??"").trim();
    const imageUrl=
      String(body.imageUrl??"").trim()||
      "/logo.svg";

    if(
      !Number.isInteger(productId)||
      productId<=0
    ){
      return NextResponse.json(
        {
          error:"ID de producto inválido"
        },
        {
          status:400
        }
      );
    }

    if(
      !Number.isFinite(price)||
      price<=0
    ){
      return NextResponse.json(
        {
          error:"El precio de publicación debe ser mayor a 0"
        },
        {
          status:400
        }
      );
    }

    const {
      data:product,
      error:productError
    }=await supabaseAdmin
      .from("products")
      .select("id,name,is_active")
      .eq("id",productId)
      .maybeSingle();

    if(productError){
      throw productError;
    }

    if(!product){
      return NextResponse.json(
        {
          error:"El producto no existe"
        },
        {
          status:404
        }
      );
    }

    if(product.is_active===true){
      return NextResponse.json(
        {
          error:"El producto ya está publicado"
        },
        {
          status:409
        }
      );
    }

    const {
      data:updated,
      error:updateError
    }=await supabaseAdmin
      .from("products")
      .update({
        price,
        description,
        image_url:imageUrl,
        is_active:true
      })
      .eq("id",productId)
      .select(`
        id,
        name,
        price,
        unit,
        is_active
      `)
      .single();

    if(updateError){
      throw updateError;
    }

    return NextResponse.json({
      success:true,
      product:{
        ...updated,
        id:Number(updated.id),
        price:Number(updated.price)
      }
    });

  }catch(error){
    console.error(
      "ERROR PUBLICANDO PRODUCTO CENADA:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"No se pudo publicar el producto"
      },
      {
        status:500
      }
    );
  }
}
