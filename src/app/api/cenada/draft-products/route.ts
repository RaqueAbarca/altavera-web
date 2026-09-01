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
    const {
      data:products,
      error:productsError
    }=await supabaseAdmin
      .from("products")
      .select(`
        id,
        name,
        description,
        category,
        price,
        unit,
        image_url,
        is_active
      `)
      .eq("is_active",false)
      .order("name");

    if(productsError){
      throw productsError;
    }

    const productIds=
      (products??[])
        .map(product=>Number(product.id));

    let cenadaRows:Array<{
      product_id:number;
      date:string;
      cenada_name:string|null;
      cenada_unit:string|null;
      price_per_unit:number|null;
    }>=[];

    if(productIds.length>0){
      const {
        data,
        error
      }=await supabaseAdmin
        .from("cenada_prices")
        .select(`
          product_id,
          date,
          cenada_name,
          cenada_unit,
          price_per_unit
        `)
        .in("product_id",productIds)
        .order("date",{
          ascending:false
        });

      if(error){
        throw error;
      }

      cenadaRows=(data??[]) as typeof cenadaRows;
    }

    const latestByProduct=
      new Map<number,typeof cenadaRows[number]>();

    for(const row of cenadaRows){
      if(
        !latestByProduct.has(
          Number(row.product_id)
        )
      ){
        latestByProduct.set(
          Number(row.product_id),
          row
        );
      }
    }

    return NextResponse.json({
      success:true,
      products:(products??[]).map(product=>{
        const latest=
          latestByProduct.get(
            Number(product.id)
          );

        return{
          id:Number(product.id),
          name:product.name,
          description:product.description??"",
          category:product.category??"",
          price:Number(product.price),
          unit:product.unit??"",
          imageUrl:product.image_url??"",
          cenada:latest
            ?{
                date:latest.date,
                name:latest.cenada_name,
                sourceUnit:latest.cenada_unit,
                cost:
                  latest.price_per_unit===null
                    ?null
                    :Number(latest.price_per_unit)
              }
            :null
        };
      })
    });

  }catch(error){
    console.error(
      "ERROR CARGANDO BORRADORES CENADA:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"No se pudieron cargar los productos en borrador"
      },
      {
        status:500
      }
    );
  }
}
