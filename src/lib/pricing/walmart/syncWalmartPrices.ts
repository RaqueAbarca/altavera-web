import { supabaseAdmin } from "@/lib/supabaseAdmin";

type MatchRow={
  product_id:number;
  priority:number;
  conversion_factor:number;
  competitor_products:{
    id:number;
    raw_price:number|null;
    current_price:number|null;
    regular_price:number|null;
    discount_percent:number|null;
    external_id:string;
    name:string;
    competitor_id:number;
    last_seen_at:string|null;
    reference_label:string|null;
    reference_region_id:string|null;
    validation_status:string|null;
    last_update_run_id:string|null;
  }|null;
};

type Options={
  updateRunId?:string;
  competitorProductIds?:number[];
};

export async function syncWalmartPrices(
  options:Options={}
){
  let query=supabaseAdmin
    .from("competitor_product_matches")
    .select(`
      product_id,
      priority,
      conversion_factor,
      competitor_products(
        id,
        raw_price,
        current_price,
        regular_price,
        discount_percent,
        external_id,
        name,
        competitor_id,
        last_seen_at,
        reference_label,
        reference_region_id,
        validation_status,
        last_update_run_id
      )
    `)
    .eq("action","use")
    .eq("verified",true)
    .not("conversion_factor","is",null);

  if(
    options.competitorProductIds&&
    options.competitorProductIds.length>0
  ){
    query=query.in(
      "competitor_product_id",
      options.competitorProductIds
    );
  }

  const {data,error}=await query;

  if(error){
    throw error;
  }

  const matches=(data??[]) as unknown as MatchRow[];
  const byProduct=new Map<number,MatchRow[]>();
  let blocked=0;

  for(const match of matches){
    const walmart=match.competitor_products;
    const currentPrice=
      walmart?.current_price??
      walmart?.raw_price??
      null;

    if(
      !match.product_id||
      !walmart||
      currentPrice===null||
      !match.conversion_factor||
      match.conversion_factor<=0
    ){
      continue;
    }

    /*
     * Solo entran al motor observaciones que pasaron todas las
     * validaciones determinísticas.
     */
    if(walmart.validation_status!=="valid"){
      blocked++;
      continue;
    }

    /*
     * Cuando la sincronización pertenece a una actualización concreta,
     * el producto tiene que haber sido observado en ESA misma corrida.
     * Esto impide reutilizar silenciosamente un dato anterior.
     */
    if(
      options.updateRunId&&
      walmart.last_update_run_id!==options.updateRunId
    ){
      blocked++;
      continue;
    }

    const current=byProduct.get(match.product_id)??[];
    current.push(match);
    byProduct.set(match.product_id,current);
  }

  const observedAt=new Date().toISOString();
  const observedDate=observedAt.slice(0,10);
  let saved=0;
  let skipped=0;

  for(const [productId,productMatches] of byProduct){
    const bestPriority=Math.min(
      ...productMatches.map(match=>match.priority??1)
    );

    const preferred=productMatches.filter(
      match=>(match.priority??1)===bestPriority
    );

    const candidates=preferred
      .map(match=>{
        const walmart=match.competitor_products!;
        const currentPrice=walmart.current_price??walmart.raw_price;
        const regularPrice=walmart.regular_price??currentPrice;
        const factor=Number(match.conversion_factor);

        return{
          match,
          normalizedCurrent:Number(currentPrice)/factor,
          normalizedRegular:Number(regularPrice)/factor
        };
      })
      .filter(item=>
        Number.isFinite(item.normalizedCurrent)&&
        item.normalizedCurrent>0&&
        Number.isFinite(item.normalizedRegular)&&
        item.normalizedRegular>0
      )
      .sort((a,b)=>a.normalizedCurrent-b.normalizedCurrent);

    const selected=candidates[0];

    if(!selected){
      skipped++;
      continue;
    }

    const walmart=selected.match.competitor_products!;
    const normalizedCurrent=
      Math.round(selected.normalizedCurrent*100)/100;
    const normalizedRegular=
      Math.round(selected.normalizedRegular*100)/100;

    const {error:saveError}=await supabaseAdmin
      .from("competitor_prices")
      .upsert(
        {
          product_id:productId,
          competitor_id:walmart.competitor_id,
          date:observedDate,
          price:normalizedCurrent,
          regular_price:normalizedRegular,
          discount_percent:walmart.discount_percent??0,
          reference_label:walmart.reference_label,
          reference_region_id:walmart.reference_region_id,
          update_run_id:options.updateRunId??walmart.last_update_run_id,
          observed_at:observedAt,
          source_competitor_product_id:walmart.id,
          url:null
        },
        {
          onConflict:"product_id,competitor_id,date"
        }
      );

    if(saveError){
      throw saveError;
    }

    saved++;
  }

  return{
    analyzed:matches.length,
    products:byProduct.size,
    saved,
    skipped,
    blocked
  };
}
