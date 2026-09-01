import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { pricingEngineV2 } from "@/lib/pricing/engine/pricingEngineV2";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(
  request:Request
){
  const auth=
    await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const body=
      await request.json();

    const result=
      pricingEngineV2({
        cenadaCost:
          Number(
            body.cenadaCost
          ),

        currentPrice:
          body.currentPrice===null||
          body.currentPrice===undefined
            ?null
            :Number(
                body.currentPrice
              ),

        competitorPrice:
          body.competitorPrice===null||
          body.competitorPrice===undefined
            ?null
            :Number(
                body.competitorPrice
              ),

        minimumMargin:
          body.minimumMargin===
            undefined
            ?0.30
            :Number(
                body.minimumMargin
              ),

        targetDiscount:
          body.targetDiscount===
            undefined
            ?0.20
            :Number(
                body.targetDiscount
              ),

        fallbackDiscount:
          body.fallbackDiscount===
            undefined
            ?0.10
            :Number(
                body.fallbackDiscount
              ),

        wasteRate:
          body.wasteRate===
            undefined
            ?0
            :Number(
                body.wasteRate
              ),

        packagingCost:
          body.packagingCost===
            undefined
            ?0
            :Number(
                body.packagingCost
              ),

        handlingCost:
          body.handlingCost===
            undefined
            ?0
            :Number(
                body.handlingCost
              ),

        otherVariableCost:
          body.otherVariableCost===
            undefined
            ?0
            :Number(
                body.otherVariableCost
              ),

        roundingIncrement:
          body.roundingIncrement===
            undefined
            ?50
            :Number(
                body.roundingIncrement
              ),

        priceChangeThreshold:
          body.priceChangeThreshold===
            undefined
            ?0.05
            :Number(
                body.priceChangeThreshold
              ),

        applyStabilityThreshold:
          body.applyStabilityThreshold===
            undefined
            ?true
            :Boolean(
                body.applyStabilityThreshold
              )
      });

    return NextResponse.json({
      success:true,
      result
    });

  }catch(error){
    console.error(
      "ERROR PRICING PREVIEW:",
      error
    );

    return NextResponse.json(
      {
        success:false,

        error:
          error instanceof Error
            ?error.message
            :"Error calculando precio"
      },
      {
        status:500
      }
    );
  }
}