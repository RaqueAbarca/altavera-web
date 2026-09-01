import { supabaseAdmin } from "@/lib/supabaseAdmin";

type MatchRow={
  product_id:number;
  priority:number;
  conversion_factor:number;
  competitor_products:{
    raw_price:number|null;
    external_id:string;
    name:string;
    competitor_id:number;
  }|null;
};

export async function syncWalmartPrices(){
  const {data,error}=
    await supabaseAdmin
      .from("competitor_product_matches")
      .select(`
        product_id,
        priority,
        conversion_factor,
        competitor_products(
          raw_price,
          external_id,
          name,
          competitor_id
        )
      `)
      .eq("action","use")
      .eq("verified",true)
      .not("conversion_factor","is",null);

  if(error){
    throw error;
  }

  const matches=
    (data??[]) as unknown as MatchRow[];

  /*
   * Agrupamos las posibles referencias
   * Walmart por producto Altavera.
   */
  const byProduct=
    new Map<number,MatchRow[]>();

  for(const match of matches){
    if(
      !match.product_id||
      !match.competitor_products||
      match.competitor_products.raw_price===null||
      !match.conversion_factor||
      match.conversion_factor<=0
    ){
      continue;
    }

    const current=
      byProduct.get(match.product_id)??[];

    current.push(match);

    byProduct.set(
      match.product_id,
      current
    );
  }

  const today=
    new Date()
      .toISOString()
      .split("T")[0];

  let saved=0;
  let skipped=0;

  for(const [
    productId,
    productMatches
  ] of byProduct){

    /*
     * Menor priority = preferido.
     */
    const bestPriority=
      Math.min(
        ...productMatches.map(
          match=>match.priority??1
        )
      );

    const preferred=
      productMatches.filter(
        match=>
          (match.priority??1)===
          bestPriority
      );

    /*
     * Si existen varias referencias
     * igualmente válidas/prioritarias,
     * usamos la más conservadora:
     * el precio Walmart más bajo.
     *
     * Esto evita pensar que tenemos más
     * espacio competitivo del que realmente
     * existe.
     */
    const candidates=
      preferred
        .map(match=>{
          const walmart=
            match.competitor_products!;

          const normalizedPrice=
            Number(walmart.raw_price)/
            Number(match.conversion_factor);

          return{
            match,
            normalizedPrice
          };
        })
        .filter(
          item=>
            Number.isFinite(
              item.normalizedPrice
            )&&
            item.normalizedPrice>0
        )
        .sort(
          (a,b)=>
            a.normalizedPrice-
            b.normalizedPrice
        );

    const selected=
      candidates[0];

    if(!selected){
      skipped++;
      continue;
    }

    const walmart=
      selected.match
        .competitor_products!;

    const normalizedPrice=
      Math.round(
        selected.normalizedPrice*100
      )/100;

    const {error:saveError}=
      await supabaseAdmin
        .from("competitor_prices")
        .upsert(
          {
            product_id:productId,
            competitor_id:
              walmart.competitor_id,
            date:today,
            price:normalizedPrice,
            url:null
          },
          {
            onConflict:
              "product_id,competitor_id,date"
          }
        );

    if(saveError){
      throw saveError;
    }

    saved++;
  }

  return{
    analyzed:matches.length,
    products:
      byProduct.size,
    saved,
    skipped
  };
}