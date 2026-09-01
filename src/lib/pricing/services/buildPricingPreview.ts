import { supabaseAdmin } from "@/lib/supabaseAdmin";

import {
  pricingEngineV2
} from "@/lib/pricing/engine/pricingEngineV2";

type Product={
  id:number;
  name:string;
  category:string|null;
  price:number|null;
};

type CostSettings={
  product_id:number;
  waste_rate:number;
  packaging_cost:number;
  handling_cost:number;
  other_variable_cost:number;
};

type CenadaPrice={
  product_id:number;
  date:string;
  bulletin_number:string|null;
  cenada_name:string|null;
  price_per_unit:number;
};

type CenadaMapping={
  normalized_name:string;
  product_id:number|null;
  action:"use"|"ignore";
  priority:number;
};

type CompetitorPrice={
  product_id:number;
  competitor_id:number;
  date:string;
  price:number;
};

type PricingRule={
  category:string|null;
  minimum_margin:number;
  competitive_minimum_margin:number;
  walmart_discount:number;
  walmart_fallback_discount:number;
  price_change_threshold:number;
  competitor_max_age_days:number;
  enabled:boolean;
};

type BuildPricingPreviewOptions={
  applyStabilityThreshold?:boolean;
  cycleId?:number|null;
};

function normalize(
  value:string|null
){
  return value
    ?.trim()
    .toLowerCase()??"";
}

function daysBetween(
  date:string,
  now:Date
){
  const source=
    new Date(
      `${date}T00:00:00Z`
    );

  const difference=
    now.getTime()-
    source.getTime();

  return Math.floor(
    difference/
    (
      1000*
      60*
      60*
      24
    )
  );
}

export async function buildPricingPreview(
  options:BuildPricingPreviewOptions={}
){
  const applyStabilityThreshold=
    options
      .applyStabilityThreshold??
    true;

  const cycleId=
    options.cycleId??
    null;

  const [
    productsResult,
    costsResult,
    cenadaResult,
    mappingsResult,
    competitorsResult,
    competitorPricesResult,
    rulesResult
  ]=await Promise.all([
    supabaseAdmin
      .from("products")
      .select(`
        id,
        name,
        category,
        price
      `)
      .eq("is_active",true)
      .order("name"),

    supabaseAdmin
      .from("product_cost_settings")
      .select(`
        product_id,
        waste_rate,
        packaging_cost,
        handling_cost,
        other_variable_cost
      `),

    supabaseAdmin
      .from("cenada_prices")
      .select(`
        product_id,
        date,
        bulletin_number,
        cenada_name,
        price_per_unit
      `)
      .not(
        "price_per_unit",
        "is",
        null
      )
      .order(
        "date",
        {
          ascending:false
        }
      ),

    supabaseAdmin
      .from("cenada_product_mappings")
      .select(`
        normalized_name,
        product_id,
        action,
        priority
      `),

    supabaseAdmin
      .from("competitors")
      .select(`
        id,
        name,
        enabled
      `),

    supabaseAdmin
      .from("competitor_prices")
      .select(`
        product_id,
        competitor_id,
        date,
        price
      `)
      .order(
        "date",
        {
          ascending:false
        }
      ),

    supabaseAdmin
      .from("pricing_rules")
      .select(`
        category,
        minimum_margin,
        competitive_minimum_margin,
        walmart_discount,
        walmart_fallback_discount,
        price_change_threshold,
        competitor_max_age_days,
        enabled
      `)
      .eq(
        "enabled",
        true
      )
  ]);

  if(productsResult.error){
    throw productsResult.error;
  }

  if(costsResult.error){
    throw costsResult.error;
  }

  if(cenadaResult.error){
    throw cenadaResult.error;
  }

  if(mappingsResult.error){
    throw mappingsResult.error;
  }

  if(competitorsResult.error){
    throw competitorsResult.error;
  }

  if(competitorPricesResult.error){
    throw competitorPricesResult.error;
  }

  if(rulesResult.error){
    throw rulesResult.error;
  }

  const products=
    (productsResult.data??[]) as Product[];

  const costs=
    (costsResult.data??[]) as CostSettings[];

  let cenadaPrices=
    (cenadaResult.data??[]) as CenadaPrice[];

  const mappings=
    (mappingsResult.data??[]) as CenadaMapping[];

  const competitorPrices=
    (competitorPricesResult.data??[]) as CompetitorPrice[];

  const rules=
    (rulesResult.data??[]) as PricingRule[];

  /*
   * Si existe ciclo oficial,
   * usar exclusivamente los boletines
   * pertenecientes a ese ciclo.
   */
  if(
    cycleId!==null
  ){
    const {
      data:cycleBulletins,
      error:cycleBulletinsError
    }=await supabaseAdmin
      .from(
        "pricing_cycle_bulletins"
      )
      .select(`
        bulletin_type,
        bulletin_date,
        status
      `)
      .eq(
        "cycle_id",
        cycleId
      )
      .eq(
        "status",
        "completed"
      );

    if(
      cycleBulletinsError
    ){
      throw cycleBulletinsError;
    }

    const bulletinSet=
      new Set(
        (
          cycleBulletins??
          []
        ).map(
          bulletin=>
            `${
              bulletin.bulletin_type
            }|${
              bulletin.bulletin_date
            }`
        )
      );

    cenadaPrices=
      cenadaPrices.filter(
        row=>
          bulletinSet.has(
            `${
              row.bulletin_number
            }|${
              row.date
            }`
          )
      );
  }

  const walmart=
    competitorsResult
      .data
      ?.find(
        competitor=>
          competitor.name===
          "Walmart"&&
          competitor.enabled
      );

  if(!walmart){
    throw new Error(
      "No existe Walmart habilitado en competitors"
    );
  }

  const walmartId=
    Number(
      walmart.id
    );

  const costByProduct=
    new Map(
      costs.map(
        cost=>[
          cost.product_id,
          cost
        ]
      )
    );

  const mappingByName=
    new Map(
      mappings.map(
        mapping=>[
          normalize(
            mapping.normalized_name
          ),
          mapping
        ]
      )
    );

  function getCenadaPrice(
    productId:number
  ){
    const rows=
      cenadaPrices.filter(
        row=>
          row.product_id===
          productId
      );

    if(
      rows.length===0
    ){
      return null;
    }

    let candidateRows=
      rows;

    /*
     * Para consultas históricas sin
     * cycleId conservamos el comportamiento
     * anterior: fecha más reciente.
     */
    if(
      cycleId===null
    ){
      const latestDate=
        rows
          .map(
            row=>
              row.date
          )
          .sort()
          .reverse()[0];

      candidateRows=
        rows.filter(
          row=>
            row.date===
            latestDate
        );
    }

    const mappedRows=
      candidateRows
        .map(
          row=>({
            row,

            mapping:
              row.cenada_name
                ?mappingByName.get(
                    normalize(
                      row.cenada_name
                    )
                  )
                :undefined
          })
        )
        .filter(
          item=>
            item.mapping
              ?.action===
            "use"&&
            item.mapping
              .product_id===
            productId
        );

    /*
     * Fallback para registros históricos
     * que no poseen mapping.
     *
     * Si existe mapping ignore,
     * jamás se utiliza.
     */
    if(
      mappedRows.length===0
    ){
      const unmappedRows=
        candidateRows.filter(
          row=>{
            if(
              !row.cenada_name||
              Number(
                row.price_per_unit
              )<=0
            ){
              return false;
            }

            const mapping=
              mappingByName.get(
                normalize(
                  row.cenada_name
                )
              );

            return !mapping;
          }
        );

      return unmappedRows
        .sort(
          (a,b)=>
            Number(
              b.price_per_unit
            )-
            Number(
              a.price_per_unit
            )
        )[0]??null;
    }

    const bestPriority=
      Math.min(
        ...mappedRows.map(
          item=>
            item.mapping!
              .priority
        )
      );

    return mappedRows
      .filter(
        item=>
          item.mapping!
            .priority===
          bestPriority
      )
      .map(
        item=>
          item.row
      )
      .filter(
        row=>
          Number(
            row.price_per_unit
          )>0
      )
      .sort(
        (a,b)=>
          Number(
            b.price_per_unit
          )-
          Number(
            a.price_per_unit
          )
      )[0]??null;
  }

  function getPricingRule(
    category:string|null
  ):PricingRule{
    const categoryRule=
      rules.find(
        rule=>
          normalize(
            rule.category
          )===
          normalize(
            category
          )&&
          rule.category!==null
      );

    if(
      categoryRule
    ){
      return categoryRule;
    }

    const generalRule=
      rules.find(
        rule=>
          !rule.category
      );

    if(
      generalRule
    ){
      return generalRule;
    }

    if(
      rules[0]
    ){
      return rules[0];
    }

    return{
      category:null,
      minimum_margin:0.30,
      competitive_minimum_margin:0.20,
      walmart_discount:0.20,
      walmart_fallback_discount:0.10,
      price_change_threshold:0.05,
      competitor_max_age_days:7,
      enabled:true
    };
  }

  function getWalmartPrice(
    productId:number,
    maxAgeDays:number
  ){
    const price=
      competitorPrices.find(
        row=>
          row.product_id===
          productId&&
          row.competitor_id===
          walmartId
      );

    if(
      !price
    ){
      return null;
    }

    const age=
      daysBetween(
        price.date,
        new Date()
      );

    if(
      age<0||
      age>maxAgeDays
    ){
      return null;
    }

    return price;
  }

  const recommendations=[];
  const skipped=[];

  for(
    const product
    of products
  ){
    const cenada=
      getCenadaPrice(
        product.id
      );

    if(
      !cenada
    ){
      skipped.push({
        productId:
          product.id,

        productName:
          product.name,

        reason:
          cycleId!==null
            ?"No existe costo CENADA normalizado para este ciclo"
            :"No existe costo CENADA normalizado"
      });

      continue;
    }

    const rule=
      getPricingRule(
        product.category
      );

    const walmartPrice=
      getWalmartPrice(
        product.id,
        Number(
          rule
            .competitor_max_age_days
        )
      );

    const settings=
      costByProduct.get(
        product.id
      );

    const result=
      pricingEngineV2({
        cenadaCost:
          Number(
            cenada.price_per_unit
          ),

        currentPrice:
          product.price===null
            ?null
            :Number(
                product.price
              ),

        competitorPrice:
          walmartPrice
            ?Number(
                walmartPrice.price
              )
            :null,

        minimumMargin:
          Number(
            rule.minimum_margin
          ),

        competitiveMinimumMargin:
          Number(
            rule
              .competitive_minimum_margin
          ),

        targetDiscount:
          Number(
            rule
              .walmart_discount
          ),

        fallbackDiscount:
          Number(
            rule
              .walmart_fallback_discount
          ),

        wasteRate:
          Number(
            settings
              ?.waste_rate??
            0
          ),

        packagingCost:
          Number(
            settings
              ?.packaging_cost??
            0
          ),

        handlingCost:
          Number(
            settings
              ?.handling_cost??
            0
          ),

        otherVariableCost:
          Number(
            settings
              ?.other_variable_cost??
            0
          ),

        roundingIncrement:
          50,

        priceChangeThreshold:
          Number(
            rule
              .price_change_threshold
          ),

        applyStabilityThreshold
      });

    recommendations.push({
      productId:
        product.id,

      productName:
        product.name,

      category:
        product.category,

      cenada:{
        date:
          cenada.date,

        name:
          cenada.cenada_name,

        bulletinType:
          cenada.bulletin_number,

        cost:
          Number(
            cenada.price_per_unit
          )
      },

      walmart:
        walmartPrice
          ?{
              date:
                walmartPrice.date,

              price:
                Number(
                  walmartPrice.price
                )
            }
          :null,

      result
    });
  }

  return{
    summary:{
      cycleId,

      products:
        products.length,

      recommendations:
        recommendations.length,

      skipped:
        skipped.length,

      withWalmart:
        recommendations.filter(
          item=>
            item.walmart!==null
        ).length,

      withoutWalmart:
        recommendations.filter(
          item=>
            item.walmart===null
        ).length,

      requiresReview:
        recommendations.filter(
          item=>
            item.result
              .requiresReview
        ).length,

      competitiveExceptions:
        recommendations.filter(
          item=>
            item.result
              .competitiveExceptionApplied
        ).length,

      stabilityApplied:
        recommendations.filter(
          item=>
            item.result
              .stabilityApplied
        ).length
    },

    recommendations,

    skipped
  };
}