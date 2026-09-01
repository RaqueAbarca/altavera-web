import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createDraftProductFromCenada } from "@/lib/pricing/cenada/createDraftProduct";

export const runtime="nodejs";

export async function POST(request:Request){
  const auth=await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const body=await request.json();

    const pendingId=Number(body.pendingId);
    const conversionFactor=Number(body.conversionFactor);

    if(
      !Number.isInteger(pendingId)||
      pendingId<=0
    ){
      return NextResponse.json(
        {
          error:"ID de producto CENADA inválido"
        },
        {
          status:400
        }
      );
    }

    const result=
      await createDraftProductFromCenada({
        pendingId,
        name:String(body.name??""),
        category:String(body.category??""),
        unit:String(body.unit??""),
        conversionFactor,
        description:String(body.description??""),
        imageUrl:String(body.imageUrl??"")
      });

    return NextResponse.json({
      success:true,
      ...result
    });

  }catch(error){
    console.error(
      "ERROR CREANDO PRODUCTO DESDE CENADA:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"No se pudo crear el producto"
      },
      {
        status:500
      }
    );
  }
}
