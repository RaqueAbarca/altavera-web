import { supabaseAdmin } from "@/lib/supabaseAdmin";

import type {
  CenadaBulletinType
} from "./types";

export const REQUIRED_CENADA_BULLETINS:
  CenadaBulletinType[]=[
    "plaza",
    "fruta_importada",
    "aromaticos_gourmet"
  ];

type BulletinStatus=
  |"processing"
  |"completed"
  |"failed";

type CycleStatus=
  |"incomplete"
  |"ready"
  |"running"
  |"completed";

export type CenadaCycleSource={
  bulletinType:CenadaBulletinType;
  bulletinDate:string;
  filename:string;
  rowsParsed:number;
  rowsProcessed:number;
  origin:"uploaded"|"history";
};

type StoredBulletin={
  cycle_id:number;
  bulletin_type:CenadaBulletinType;
  bulletin_date:string;
  filename:string|null;
  status:BulletinStatus;
  rows_parsed:number|null;
  rows_processed:number|null;
};

function sourceKey(
  source:Pick<
    CenadaCycleSource,
    "bulletinType"|"bulletinDate"
  >
){
  return `${source.bulletinType}|${source.bulletinDate}`;
}

function sourceSetKey(
  sources:Array<
    Pick<
      CenadaCycleSource,
      "bulletinType"|"bulletinDate"
    >
  >
){
  return sources
    .map(sourceKey)
    .sort()
    .join("::");
}

export async function getOrCreateCenadaCycle(
  cycleId?:number
){
  if(cycleId!==undefined){
    const {
      data,
      error
    }=await supabaseAdmin
      .from("pricing_cycles")
      .select("*")
      .eq("id",cycleId)
      .single();

    if(error){
      throw error;
    }

    if(
      data.status==="running"||
      data.status==="completed"
    ){
      throw new Error(
        `El ciclo ${cycleId} ya no acepta nuevos boletines`
      );
    }

    return data;
  }

  const {
    data,
    error
  }=await supabaseAdmin
    .from("pricing_cycles")
    .insert({
      status:"incomplete",
      expected_bulletins:
        REQUIRED_CENADA_BULLETINS.length
    })
    .select()
    .single();

  if(error){
    throw error;
  }

  return data;
}

export async function saveCenadaCycleBulletin(
  input:{
    cycleId:number;
    bulletinType:CenadaBulletinType;
    bulletinDate:string;
    filename:string;
    status:BulletinStatus;
    rowsParsed:number;
    rowsProcessed:number;
    errorMessage?:string|null;
  }
){
  const {
    error
  }=await supabaseAdmin
    .from("pricing_cycle_bulletins")
    .upsert(
      {
        cycle_id:input.cycleId,
        bulletin_type:input.bulletinType,
        bulletin_date:input.bulletinDate,
        filename:input.filename,
        status:input.status,
        rows_parsed:input.rowsParsed,
        rows_processed:input.rowsProcessed,
        error_message:
          input.errorMessage??null,
        updated_at:
          new Date().toISOString()
      },
      {
        onConflict:
          "cycle_id,bulletin_type"
      }
    );

  if(error){
    throw error;
  }
}

async function getCompletedBulletinHistory(){
  const {
    data,
    error
  }=await supabaseAdmin
    .from("pricing_cycle_bulletins")
    .select(`
      cycle_id,
      bulletin_type,
      bulletin_date,
      filename,
      status,
      rows_parsed,
      rows_processed
    `)
    .eq("status","completed")
    .order(
      "bulletin_date",
      {
        ascending:false
      }
    )
    .order(
      "cycle_id",
      {
        ascending:false
      }
    );

  if(error){
    throw error;
  }

  return(
    data??[]
  ) as StoredBulletin[];
}

async function getCenadaPriceHistorySources(){
  const {
    data,
    error
  }=await supabaseAdmin
    .from("cenada_prices")
    .select(`
      bulletin_number,
      date
    `)
    .in(
      "bulletin_number",
      REQUIRED_CENADA_BULLETINS
    )
    .order(
      "date",
      {
        ascending:false
      }
    );

  if(error){
    throw error;
  }

  const sources:
    CenadaCycleSource[]=[];

  const seen=
    new Set<string>();

  for(const row of data??[]){
    const bulletinType=
      row.bulletin_number as
        CenadaBulletinType;

    const key=
      `${bulletinType}|${row.date}`;

    if(seen.has(key)){
      continue;
    }

    seen.add(key);

    sources.push({
      bulletinType,
      bulletinDate:row.date,
      filename:
        `Histórico CENADA ${bulletinType}`,
      rowsParsed:0,
      rowsProcessed:0,
      origin:"history"
    });
  }

  return sources;
}

export async function resolveCenadaCycleSources(
  uploadedSources:CenadaCycleSource[]
){
  const [
    cycleHistory,
    priceHistory
  ]=await Promise.all([
    getCompletedBulletinHistory(),
    getCenadaPriceHistorySources()
  ]);

  const selected:
    CenadaCycleSource[]=[];

  const missing:
    CenadaBulletinType[]=[];

  for(
    const bulletinType
    of REQUIRED_CENADA_BULLETINS
  ){
    const uploaded=
      uploadedSources
        .filter(
          source=>
            source.bulletinType===
            bulletinType
        )
        .sort(
          (a,b)=>
            b.bulletinDate.localeCompare(
              a.bulletinDate
            )
        );

    const historicalFromCycles=
      cycleHistory
        .filter(
          bulletin=>
            bulletin.bulletin_type===
            bulletinType
        )
        .map(
          bulletin=>(
            {
              bulletinType,
              bulletinDate:
                bulletin.bulletin_date,
              filename:
                bulletin.filename??
                `CENADA ${bulletinType}`,
              rowsParsed:
                Number(
                  bulletin.rows_parsed??0
                ),
              rowsProcessed:
                Number(
                  bulletin.rows_processed??0
                ),
              origin:
                "history" as const
            }
          )
        );

    const historicalFromPrices=
      priceHistory.filter(
        source=>
          source.bulletinType===
          bulletinType
      );

    const candidates=[
      ...uploaded,
      ...historicalFromCycles,
      ...historicalFromPrices
    ].sort(
      (a,b)=>{
        const dateCompare=
          b.bulletinDate.localeCompare(
            a.bulletinDate
          );

        if(dateCompare!==0){
          return dateCompare;
        }

        if(
          a.origin===b.origin
        ){
          return 0;
        }

        return a.origin==="uploaded"
          ?-1
          :1;
      }
    );

    const best=
      candidates[0];

    if(!best){
      missing.push(
        bulletinType
      );

      continue;
    }

    selected.push(
      best
    );
  }

  return{
    sources:selected,
    missing
  };
}

async function findExistingCycleForSources(
  sources:CenadaCycleSource[]
){
  const history=
    await getCompletedBulletinHistory();

  const targetKey=
    sourceSetKey(
      sources
    );

  const byCycle=
    new Map<
      number,
      Array<{
        bulletinType:CenadaBulletinType;
        bulletinDate:string;
      }>
    >();

  for(const bulletin of history){
    const cycleId=
      Number(
        bulletin.cycle_id
      );

    const current=
      byCycle.get(cycleId)??[];

    current.push({
      bulletinType:
        bulletin.bulletin_type,
      bulletinDate:
        bulletin.bulletin_date
    });

    byCycle.set(
      cycleId,
      current
    );
  }

  const matchingCycleIds=
    [...byCycle.entries()]
      .filter(
        ([,cycleSources])=>
          cycleSources.length===
            REQUIRED_CENADA_BULLETINS.length&&
          sourceSetKey(
            cycleSources
          )===targetKey
      )
      .map(
        ([cycleId])=>
          cycleId
      )
      .sort(
        (a,b)=>b-a
      );

  const cycleId=
    matchingCycleIds[0];

  if(!cycleId){
    return null;
  }

  const {
    data,
    error
  }=await supabaseAdmin
    .from("pricing_cycles")
    .select("*")
    .eq("id",cycleId)
    .maybeSingle();

  if(error){
    throw error;
  }

  return data;
}

export async function getOrCreateCenadaCycleForSources(
  sources:CenadaCycleSource[],
  requestedCycleId?:number
){
  const sourceTypes=
    new Set(
      sources.map(
        source=>
          source.bulletinType
      )
    );

  if(
    sources.length!==
      REQUIRED_CENADA_BULLETINS.length||
    sourceTypes.size!==
      REQUIRED_CENADA_BULLETINS.length
  ){
    throw new Error(
      "No se puede crear un ciclo CENADA sin una fuente válida de cada tipo"
    );
  }

  if(requestedCycleId===undefined){
    const existing=
      await findExistingCycleForSources(
        sources
      );

    if(existing){
      if(
        existing.status!=="ready"
      ){
        const refreshed=
          await refreshCenadaCycleStatus(
            Number(existing.id)
          );

        return{
          cycle:refreshed,
          reused:true
        };
      }

      return{
        cycle:existing,
        reused:true
      };
    }
  }

  const cycle=
    await getOrCreateCenadaCycle(
      requestedCycleId
    );

  const cycleId=
    Number(
      cycle.id
    );

  for(const source of sources){
    await saveCenadaCycleBulletin({
      cycleId,
      bulletinType:
        source.bulletinType,
      bulletinDate:
        source.bulletinDate,
      filename:
        source.filename,
      status:"completed",
      rowsParsed:
        source.rowsParsed,
      rowsProcessed:
        source.rowsProcessed
    });
  }

  const refreshed=
    await refreshCenadaCycleStatus(
      cycleId
    );

  return{
    cycle:refreshed,
    reused:false
  };
}

export async function refreshCenadaCycleStatus(
  cycleId:number
){
  const {
    data:bulletins,
    error
  }=await supabaseAdmin
    .from("pricing_cycle_bulletins")
    .select(`
      bulletin_type,
      bulletin_date,
      status
    `)
    .eq("cycle_id",cycleId);

  if(error){
    throw error;
  }

  const completed=
    new Set(
      (bulletins??[])
        .filter(
          bulletin=>
            bulletin.status===
            "completed"
        )
        .map(
          bulletin=>
            bulletin
              .bulletin_type as
              CenadaBulletinType
        )
    );

  const missing=
    REQUIRED_CENADA_BULLETINS
      .filter(
        type=>
          !completed.has(
            type
          )
      );

  const dates=
    (bulletins??[])
      .filter(
        bulletin=>
          bulletin.status===
          "completed"
      )
      .map(
        bulletin=>
          bulletin.bulletin_date
      )
      .filter(
        (
          date
        ):date is string=>
          Boolean(date)
      )
      .sort();

  const cycleDate=
    dates.length>0
      ?dates[dates.length-1]
      :null;

  const ready=
    missing.length===0;

  const status:CycleStatus=
    ready
      ?"ready"
      :"incomplete";

  const now=
    new Date().toISOString();

  const {
    data:currentCycle,
    error:currentError
  }=await supabaseAdmin
    .from("pricing_cycles")
    .select("ready_at")
    .eq("id",cycleId)
    .maybeSingle();

  if(currentError){
    throw currentError;
  }

  const {
    data:cycle,
    error:updateError
  }=await supabaseAdmin
    .from("pricing_cycles")
    .update({
      cycle_date:cycleDate,
      status,
      ready_at:
        ready
          ?currentCycle?.ready_at??now
          :null,
      updated_at:now
    })
    .eq("id",cycleId)
    .select()
    .single();

  if(updateError){
    throw updateError;
  }

  return{
    ...cycle,
    missingBulletins:missing,
    completedBulletins:
      completed.size,
    ready
  };
}

export async function assertCenadaCycleReady(
  cycleId:number
){
  const status=
    await refreshCenadaCycleStatus(
      cycleId
    );

  if(!status.ready){
    throw new Error(
      `El ciclo CENADA ${cycleId} está incompleto. Faltan: ${status.missingBulletins.join(", ")}`
    );
  }

  return status;
}

export async function getLatestReadyCenadaCycle(){
  const {
    data,
    error
  }=await supabaseAdmin
    .from("pricing_cycles")
    .select("*")
    .eq("status","ready")
    .order(
      "created_at",
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

export async function setCenadaCycleStatus(
  cycleId:number,
  status:
    |"ready"
    |"running"
    |"completed"
){
  const now=
    new Date().toISOString();

  const patch:{
    status:string;
    updated_at:string;
    completed_at?:string|null;
  }={
    status,
    updated_at:now
  };

  if(status==="completed"){
    patch.completed_at=now;
  }

  if(status==="ready"){
    patch.completed_at=null;
  }

  const {
    error
  }=await supabaseAdmin
    .from("pricing_cycles")
    .update(patch)
    .eq("id",cycleId);

  if(error){
    throw error;
  }
}
