import { NextResponse } from "next/server";

import {
  requireAdmin
} from "@/lib/auth/requireAdmin";

import {
  supabaseAdmin
} from "@/lib/supabaseAdmin";

export const runtime="nodejs";

type RequestBody={
  runId?:number;
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

    const runId=
      Number(
        body.runId
      );

    if(
      !Number.isInteger(
        runId
      )||
      runId<=0
    ){
      return NextResponse.json(
        {
          error:
            "El pricing run no es válido"
        },
        {
          status:400
        }
      );
    }

    const adminUserId=
      getUserId(
        auth
      );

    const {
      data,
      error
    }=await supabaseAdmin
      .rpc(
        "publish_pricing_run",
        {
          p_run_id:
            runId,

          p_created_by:
            adminUserId
        }
      );

    if(error){
      console.error(
        "ERROR RPC PUBLICANDO PRECIOS:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message
        },
        {
          status:400
        }
      );
    }

    return NextResponse.json({
      success:true,
      result:data
    });

  }catch(error){
    console.error(
      "ERROR PUBLICANDO PRECIOS:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"No se pudieron publicar los precios"
      },
      {
        status:500
      }
    );
  }
}