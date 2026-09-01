import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { assignWalmartProduct } from "@/lib/pricing/walmart/assignWalmartProduct";

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

    const productId=
      Number(body.productId);

    if(
      !Number.isInteger(competitorProductId)||
      competitorProductId<=0||
      !Number.isInteger(productId)||
      productId<=0
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

    await assignWalmartProduct(
      competitorProductId,
      productId
    );

    return NextResponse.json({
      success:true
    });
  }catch(error){
    console.error(
      "ERROR ASIGNANDO PRODUCTO WALMART:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error asignando producto Walmart"
      },
      {
        status:500
      }
    );
  }
}