import { NextResponse } from "next/server";

import {
  requireAdmin
} from "@/lib/auth/requireAdmin";

import {
  supabaseAdmin
} from "@/lib/supabaseAdmin";

export const runtime="nodejs";

type Decision=
  |"approve"
  |"keep_current"
  |"custom"
  |"reset";

type RequestBody={
  recommendationId?:number;
  decision?:Decision;
  customPrice?:number;
};

function getUserId(
  value:unknown
):string|null{
  if(
    typeof value!=="object"||
    value===null||
    !("user" in value)
  ){
    return null;
  }

  const user=
    (
      value as {
        user?:unknown;
      }
    ).user;

  if(
    typeof user!=="object"||
    user===null||
    !("id" in user)
  ){
    return null;
  }

  const id=
    (
      user as {
        id?:unknown;
      }
    ).id;

  return typeof id==="string"
    ?id
    :null;
}

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
      (await request.json()) as RequestBody;

    const recommendationId=
      Number(
        body.recommendationId
      );

    const decision=
      body.decision;

    if(
      !Number.isInteger(
        recommendationId
      )||
      recommendationId<=0
    ){
      return NextResponse.json(
        {
          error:
            "La recomendación no es válida"
        },
        {
          status:400
        }
      );
    }

    if(
      decision!=="approve"&&
      decision!=="keep_current"&&
      decision!=="custom"&&
      decision!=="reset"
    ){
      return NextResponse.json(
        {
          error:
            "La decisión no es válida"
        },
        {
          status:400
        }
      );
    }

    const {
      data:recommendation,
      error:recommendationError
    }=await supabaseAdmin
      .from(
        "price_recommendations"
      )
      .select(`
        id,
        run_id,
        product_id,
        current_price,
        effective_cost,
        minimum_price,
        competitive_minimum_price,
        minimum_allowed_price,
        competitive_exception,
        recommended_price,
        approved_price,
        decision_type,
        status,
        published_at
      `)
      .eq(
        "id",
        recommendationId
      )
      .maybeSingle();

    if(recommendationError){
      throw recommendationError;
    }

    if(!recommendation){
      return NextResponse.json(
        {
          error:
            "No se encontró la recomendación"
        },
        {
          status:404
        }
      );
    }

    if(
      recommendation.published_at!==null
    ){
      return NextResponse.json(
        {
          error:
            "Esta decisión ya fue publicada y no puede modificarse"
        },
        {
          status:409
        }
      );
    }

    const currentPrice=
      Number(
        recommendation.current_price
      );

    const recommendedPrice=
      Number(
        recommendation.recommended_price
      );

    const minimumAllowedPrice=
      recommendation.minimum_allowed_price===null
        ?Number(
            recommendation.minimum_price
          )
        :Number(
            recommendation.minimum_allowed_price
          );

    let approvedPrice:
      number|null=
        null;

    let decisionType:
      string|null=
        null;

    let status=
      "pending";

    if(decision==="approve"){
      approvedPrice=
        recommendedPrice;

      decisionType=
        "recommended";

      status=
        "approved";
    }

    if(decision==="keep_current"){
      if(
        currentPrice<
        minimumAllowedPrice
      ){
        return NextResponse.json(
          {
            error:
              `No se puede mantener el precio actual porque está por debajo del mínimo permitido (${minimumAllowedPrice.toLocaleString(
                "es-CR",
                {
                  style:"currency",
                  currency:"CRC",
                  maximumFractionDigits:0
                }
              )})`
          },
          {
            status:400
          }
        );
      }

      approvedPrice=
        currentPrice;

      decisionType=
        "keep_current";

      status=
        "kept_current";
    }

    if(decision==="custom"){
      const customPrice=
        Number(
          body.customPrice
        );

      if(
        !Number.isFinite(
          customPrice
        )||
        customPrice<=0
      ){
        return NextResponse.json(
          {
            error:
              "Ingrese un precio personalizado válido"
          },
          {
            status:400
          }
        );
      }

      if(
        customPrice<
        minimumAllowedPrice
      ){
        return NextResponse.json(
          {
            error:
              `El precio personalizado no puede ser menor al mínimo permitido (${minimumAllowedPrice.toLocaleString(
                "es-CR",
                {
                  style:"currency",
                  currency:"CRC",
                  maximumFractionDigits:0
                }
              )})`
          },
          {
            status:400
          }
        );
      }

      approvedPrice=
        Math.round(
          customPrice*100
        )/100;

      decisionType=
        "custom";

      status=
        "approved";
    }

    if(decision==="reset"){
      approvedPrice=
        null;

      decisionType=
        null;

      status=
        "pending";
    }

    const adminUserId=
      getUserId(
        auth
      );

    const updateData=
      decision==="reset"
        ?{
            status,
            approved_price:null,
            decision_type:null,
            approved_at:null,
            approved_by:null
          }
        :{
            status,
            approved_price:
              approvedPrice,
            decision_type:
              decisionType,
            approved_at:
              new Date()
                .toISOString(),
            approved_by:
              adminUserId
          };

    const {
      data:updated,
      error:updateError
    }=await supabaseAdmin
      .from(
        "price_recommendations"
      )
      .update(
        updateData
      )
      .eq(
        "id",
        recommendationId
      )
      .select(`
        id,
        run_id,
        product_id,
        current_price,
        recommended_price,
        approved_price,
        decision_type,
        minimum_allowed_price,
        status,
        approved_at,
        approved_by,
        published_at
      `)
      .single();

    if(updateError){
      throw updateError;
    }

    return NextResponse.json({
      success:true,
      recommendation:
        updated
    });

  }catch(error){
    console.error(
      "ERROR GUARDANDO DECISIÓN DE PRECIO:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"No se pudo guardar la decisión"
      },
      {
        status:500
      }
    );
  }
}