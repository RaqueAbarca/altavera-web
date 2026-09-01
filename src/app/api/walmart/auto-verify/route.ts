import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { autoVerifyWalmartConversions } from "@/lib/pricing/walmart/autoVerifyWalmartConversions";

export const runtime="nodejs";

export async function POST(){
  const auth=
    await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const result=
      await autoVerifyWalmartConversions();

    return NextResponse.json({
      success:true,
      ...result
    });
  }catch(error){
    console.error(
      "ERROR AUTO VERIFICANDO WALMART:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error verificando conversiones Walmart"
      },
      {
        status:500
      }
    );
  }
}