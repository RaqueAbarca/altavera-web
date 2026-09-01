import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { buildPricingPreview } from "@/lib/pricing/services/buildPricingPreview";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(){
  const auth=
    await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const preview=
      await buildPricingPreview();

    return NextResponse.json({
      success:true,
      ...preview
    });
  }catch(error){
    console.error(
      "ERROR GENERANDO PREVIEW DE PRECIOS:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error generando recomendaciones"
      },
      {
        status:500
      }
    );
  }
}