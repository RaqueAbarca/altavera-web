import { NextResponse } from "next/server";
import { assignPendingProduct } from "@/lib/pricing/cenada/assignPendingProduct";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export const runtime="nodejs";

export async function POST(request:Request){

  const auth=await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{

    const {
      item,
      productId
    }=await request.json();

    const parsedProductId=
      Number(productId);

    if(
      !item||
      !Number.isInteger(parsedProductId)||
      parsedProductId<=0
    ){
      return NextResponse.json(
        {
          error:"Datos de asignación inválidos"
        },
        {
          status:400
        }
      );
    }

    await assignPendingProduct(
      item,
      parsedProductId
    );

    return NextResponse.json({
      success:true
    });

  }catch(error){

    console.error(
      "ERROR ASIGNANDO PRODUCTO CENADA:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error asignando producto"
      },
      {
        status:500
      }
    );
  }
}