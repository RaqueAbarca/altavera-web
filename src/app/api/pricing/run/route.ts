import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createPricingRun } from "@/lib/pricing/services/createPricingRun";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const ALGORITHM_VERSION="v2.4";
const AUTOMATION_DEDUP_MINUTES=15;

type RequestBody={
  cycleId?:number;
  reuseRecent?:boolean;
};

async function getRecentRun(
  cycleId:number
){
  const cutoff=
    new Date(
      Date.now()-
      AUTOMATION_DEDUP_MINUTES*
      60*
      1000
    ).toISOString();

  const {
    data,
    error
  }=await supabaseAdmin
    .from("pricing_runs")
    .select(`
      id,
      cycle_id,
      algorithm_version,
      status,
      products_processed,
      recommendations_generated,
      started_at,
      finished_at
    `)
    .eq("cycle_id",cycleId)
    .eq(
      "algorithm_version",
      ALGORITHM_VERSION
    )
    .eq("status","completed")
    .gte("started_at",cutoff)
    .order(
      "id",
      {
        ascending:false
      }
    )
    .limit(1)
    .maybeSingle();

  if(error){
    throw error;
  }

  return data;
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
    let body:RequestBody={};

    try{
      body=
        await request.json();
    }catch{
      body={};
    }

    let cycleId:
      number|undefined;

    if(
      body.cycleId!==
      undefined
    ){
      const parsed=
        Number(
          body.cycleId
        );

      if(
        !Number.isInteger(parsed)||
        parsed<=0
      ){
        return NextResponse.json(
          {
            success:false,
            error:
              "cycleId no es válido"
          },
          {
            status:400
          }
        );
      }

      cycleId=parsed;
    }

    if(
      body.reuseRecent===true&&
      cycleId!==undefined
    ){
      const recent=
        await getRecentRun(
          cycleId
        );

      if(recent){
        return NextResponse.json({
          success:true,
          reused:true,
          runId:
            Number(recent.id),
          cycleId,
          status:
            recent.status,
          summary:{
            products:
              Number(
                recent.products_processed??0
              ),
            saved:
              Number(
                recent.recommendations_generated??0
              )
          }
        });
      }
    }

    const result=
      await createPricingRun(
        cycleId
      );

    return NextResponse.json({
      success:true,
      reused:false,
      ...result
    });

  }catch(error){
    console.error(
      "ERROR CREANDO PRICING RUN:",
      error
    );

    return NextResponse.json(
      {
        success:false,
        error:
          error instanceof Error
            ?error.message
            :"Error creando corrida de precios"
      },
      {
        status:500
      }
    );
  }
}
