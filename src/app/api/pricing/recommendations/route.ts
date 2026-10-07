import { NextResponse } from "next/server";

import {
  requireAdmin
} from "@/lib/auth/requireAdmin";

import {
  supabaseAdmin
} from "@/lib/supabaseAdmin";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type ProductRelation={
  name:string;
  unit:string|null;
  category:string|null;
};

type PriceTrendDirection=
  |"up"
  |"down"
  |"same"
  |"new";

type PreviousRecommendationRow={
  product_id:number;
  cenada_price:number|null;
  competitor_price:number|null;
};

function buildPriceTrend(input:{
  currentPrice:number|null;
  previousPrice:number|null;
  currentRunId:number;
  previousRunId:number|null;
  currentCycleId:number;
  previousCycleId:number|null;
}){
  if(input.currentPrice===null){
    return null;
  }

  if(
    input.previousRunId===null||
    input.previousPrice===null||
    input.previousPrice<=0
  ){
    return{
      direction:"new" as PriceTrendDirection,
      currentPrice:input.currentPrice,
      previousPrice:null,
      difference:null,
      percentChange:null,
      currentRunId:input.currentRunId,
      previousRunId:input.previousRunId,
      currentCycleId:input.currentCycleId,
      previousCycleId:input.previousCycleId
    };
  }

  const difference=
    input.currentPrice-
    input.previousPrice;

  const percentChange=
    difference/
    input.previousPrice;

  const direction:PriceTrendDirection=
    Math.abs(difference)<0.005
      ?"same"
      :difference>0
        ?"up"
        :"down";

  return{
    direction,
    currentPrice:input.currentPrice,
    previousPrice:input.previousPrice,
    difference,
    percentChange,
    currentRunId:input.currentRunId,
    previousRunId:input.previousRunId,
    currentCycleId:input.currentCycleId,
    previousCycleId:input.previousCycleId
  };
}

function getProductRelation(
  value:
    |ProductRelation
    |ProductRelation[]
    |null
):ProductRelation|null{
  if(!value){
    return null;
  }

  if(Array.isArray(value)){
    return value[0]??null;
  }

  return value;
}

export async function GET(){
  const auth=
    await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const {
      data:run,
      error:runError
    }=await supabaseAdmin
      .from(
        "pricing_runs"
      )
      .select(`
        id,
        cycle_id,
        algorithm_version,
        status,
        products_processed,
        recommendations_generated,
        started_at,
        finished_at,
        published_at,
        published_by
      `)
      .not(
        "cycle_id",
        "is",
        null
      )
      .eq(
        "status",
        "completed"
      )
      .order(
        "id",
        {
          ascending:false
        }
      )
      .limit(1)
      .maybeSingle();

    if(runError){
      throw runError;
    }

    if(!run){
      return NextResponse.json({
        success:true,

        run:null,

        cycle:null,

        summary:{
          products:0,
          recommendations:0,
          missing:0,
          pending:0,
          requiresReview:0,
          withWalmart:0,
          withoutWalmart:0,
          competitiveExceptions:0
        },

        recommendations:[],

        missingProducts:[]
      });
    }

    const cycleId=
      Number(
        run.cycle_id
      );

    const {
      data:previousRun,
      error:previousRunError
    }=await supabaseAdmin
      .from("pricing_runs")
      .select("id,cycle_id")
      .not("cycle_id","is",null)
      .eq("status","completed")
      .lt("id",run.id)
      .order("id",{ascending:false})
      .limit(1)
      .maybeSingle();

    if(previousRunError){
      throw previousRunError;
    }

    const [
      cycleResult,
      recommendationsResult,
      productsResult,
      previousRecommendationsResult
    ]=await Promise.all([
      supabaseAdmin
        .from(
          "pricing_cycles"
        )
        .select(`
          id,
          cycle_date,
          status,
          expected_bulletins,
          ready_at,
          completed_at,
          created_at
        `)
        .eq(
          "id",
          cycleId
        )
        .maybeSingle(),

      supabaseAdmin
        .from(
          "price_recommendations"
        )
        .select(`
          id,
          run_id,
          product_id,
          current_price,
          cenada_price,
          effective_cost,
          competitor_price,
          cenada_source_date,
          cenada_bulletin_number,
          competitor_source_date,
          competitor_update_run_id,
          competitor_observed_at,
          competitor_is_fallback,

          minimum_price,
          standard_minimum_margin,

          competitive_minimum_price,
          competitive_minimum_margin,

          minimum_allowed_price,
          minimum_margin_used,
          competitive_exception,

          target_price,
          fallback_target_price,
          recommended_price,

          approved_price,
          decision_type,

          applied_margin,
          discount_used,

          status,
          requires_review,
          reason,

          approved_at,
          approved_by,

          published_at,
          published_by,

          created_at,

          products(
            name,
            unit,
            category
          )
        `)
        .eq(
          "run_id",
          run.id
        )
        .order(
          "product_id",
          {
            ascending:true
          }
        ),

      supabaseAdmin
        .from(
          "products"
        )
        .select(`
          id,
          name,
          unit,
          category,
          price
        `)
        .order(
          "name",
          {
            ascending:true
          }
        ),

      previousRun
        ?supabaseAdmin
          .from("price_recommendations")
          .select(`
            product_id,
            cenada_price,
            competitor_price
          `)
          .eq("run_id",previousRun.id)
        :Promise.resolve({data:[],error:null})
    ]);

    if(cycleResult.error){
      throw cycleResult.error;
    }

    if(recommendationsResult.error){
      throw recommendationsResult.error;
    }

    if(productsResult.error){
      throw productsResult.error;
    }

    if(previousRecommendationsResult.error){
      throw previousRecommendationsResult.error;
    }

    const recommendationRows=
      recommendationsResult.data??[];

    const previousByProduct=
      new Map<
        number,
        {
          cenadaPrice:number|null;
          competitorPrice:number|null;
        }
      >(
        ((previousRecommendationsResult.data??[]) as PreviousRecommendationRow[])
          .map(
            row=>[
              Number(row.product_id),
              {
                cenadaPrice:
                  row.cenada_price===null
                    ?null
                    :Number(row.cenada_price),
                competitorPrice:
                  row.competitor_price===null
                    ?null
                    :Number(row.competitor_price)
              }
            ] as const
          )
      );

    const recommendationProductIds=
      new Set(
        recommendationRows.map(
          row=>
            Number(
              row.product_id
            )
        )
      );

    const missingProducts=
      (productsResult.data??[])
        .filter(
          product=>
            !recommendationProductIds.has(
              Number(
                product.id
              )
            )
        );

    const missingIds=
      missingProducts.map(
        product=>
          Number(
            product.id
          )
      );

    const latestCenadaByProduct=
      new Map<
        number,
        {
          date:string;
          bulletinNumber:string|null;
          cenadaName:string|null;
          cenadaUnit:string|null;
          modePrice:number|null;
          pricePerUnit:number|null;
        }
      >();

    if(missingIds.length>0){
      const {
        data:latestCenadaRows,
        error:latestCenadaError
      }=await supabaseAdmin
        .from(
          "cenada_prices"
        )
        .select(`
          product_id,
          date,
          bulletin_number,
          cenada_name,
          cenada_unit,
          mode_price,
          price_per_unit,
          created_at
        `)
        .in(
          "product_id",
          missingIds
        )
        .order(
          "date",
          {
            ascending:false
          }
        )
        .order(
          "created_at",
          {
            ascending:false
          }
        );

      if(latestCenadaError){
        throw latestCenadaError;
      }

      for(
        const row
        of latestCenadaRows??[]
      ){
        const productId=
          Number(
            row.product_id
          );

        if(
          latestCenadaByProduct.has(
            productId
          )
        ){
          continue;
        }

        latestCenadaByProduct.set(
          productId,
          {
            date:
              row.date,

            bulletinNumber:
              row.bulletin_number,

            cenadaName:
              row.cenada_name,

            cenadaUnit:
              row.cenada_unit,

            modePrice:
              row.mode_price===null
                ?null
                :Number(
                    row.mode_price
                  ),

            pricePerUnit:
              row.price_per_unit===null
                ?null
                :Number(
                    row.price_per_unit
                  )
          }
        );
      }
    }

    const recommendations=
      recommendationRows.map(
        row=>{
          const product=
            getProductRelation(
              row.products as
                |ProductRelation
                |ProductRelation[]
                |null
            );

          const standardMinimumMargin=
            row.standard_minimum_margin===null
              ?0.30
              :Number(
                  row.standard_minimum_margin
                );

          const competitiveMinimumMargin=
            row.competitive_minimum_margin===null
              ?0.20
              :Number(
                  row.competitive_minimum_margin
                );

          const minimumPrice=
            row.minimum_price===null
              ?null
              :Number(
                  row.minimum_price
                );

          const minimumAllowedPrice=
            row.minimum_allowed_price===null
              ?minimumPrice
              :Number(
                  row.minimum_allowed_price
                );

          const productId=
            Number(
              row.product_id
            );

          const currentCenadaPrice=
            row.cenada_price===null
              ?null
              :Number(
                  row.cenada_price
                );

          const currentCompetitorPrice=
            row.competitor_price===null
              ?null
              :Number(
                  row.competitor_price
                );

          const previousSnapshot=
            previousByProduct.get(
              productId
            )??null;

          const previousRunId=
            previousRun
              ?Number(previousRun.id)
              :null;

          const previousCycleId=
            previousRun?.cycle_id===null||
            previousRun?.cycle_id===undefined
              ?null
              :Number(previousRun.cycle_id);

          return{
            id:
              Number(
                row.id
              ),

            runId:
              Number(
                row.run_id
              ),

            productId:
              productId,

            productName:
              product?.name??
              `Producto #${row.product_id}`,

            unit:
              product?.unit??
              null,

            category:
              product?.category??
              null,

            currentPrice:
              Number(
                row.current_price
              ),

            cenadaPrice:
              currentCenadaPrice,

            cenadaSourceDate:
              row.cenada_source_date??null,

            cenadaBulletinNumber:
              row.cenada_bulletin_number??null,

            cenadaTrend:
              buildPriceTrend({
                currentPrice:
                  currentCenadaPrice,
                previousPrice:
                  previousSnapshot
                    ?.cenadaPrice??null,
                currentRunId:
                  Number(run.id),
                previousRunId,
                currentCycleId:
                  cycleId,
                previousCycleId
              }),

            effectiveCost:
              row.effective_cost===null
                ?null
                :Number(
                    row.effective_cost
                  ),

            competitorPrice:
              currentCompetitorPrice,

            competitorSourceDate:
              row.competitor_source_date??null,

            competitorUpdateRunId:
              row.competitor_update_run_id??null,

            competitorObservedAt:
              row.competitor_observed_at??null,

            competitorIsFallback:
              Boolean(
                row.competitor_is_fallback
              ),

            walmartTrend:
              buildPriceTrend({
                currentPrice:
                  currentCompetitorPrice,
                previousPrice:
                  previousSnapshot
                    ?.competitorPrice??null,
                currentRunId:
                  Number(run.id),
                previousRunId,
                currentCycleId:
                  cycleId,
                previousCycleId
              }),

            minimumPrice,

            standardMinimumMargin,

            competitiveMinimumPrice:
              row.competitive_minimum_price===null
                ?null
                :Number(
                    row.competitive_minimum_price
                  ),

            competitiveMinimumMargin,

            minimumAllowedPrice,

            minimumMarginUsed:
              row.minimum_margin_used===null
                ?standardMinimumMargin
                :Number(
                    row.minimum_margin_used
                  ),

            competitiveException:
              Boolean(
                row.competitive_exception
              ),

            targetPrice:
              row.target_price===null
                ?null
                :Number(
                    row.target_price
                  ),

            fallbackTargetPrice:
              row.fallback_target_price===null
                ?null
                :Number(
                    row.fallback_target_price
                  ),

            recommendedPrice:
              Number(
                row.recommended_price
              ),

            approvedPrice:
              row.approved_price===null
                ?null
                :Number(
                    row.approved_price
                  ),

            decisionType:
              row.decision_type??
              null,

            appliedMargin:
              row.applied_margin===null
                ?null
                :Number(
                    row.applied_margin
                  ),

            discountUsed:
              row.discount_used===null
                ?null
                :Number(
                    row.discount_used
                  ),

            status:
              row.status,

            requiresReview:
              Boolean(
                row.requires_review
              ),

            reason:
              row.reason??
              null,

            approvedAt:
              row.approved_at,

            approvedBy:
              row.approved_by,

            publishedAt:
              row.published_at,

            publishedBy:
              row.published_by
          };
        }
      );

    const normalizedMissing=
      missingProducts.map(
        product=>{
          const lastCenada=
            latestCenadaByProduct.get(
              Number(
                product.id
              )
            )??null;

          return{
            productId:
              Number(
                product.id
              ),

            productName:
              product.name,

            unit:
              product.unit,

            category:
              product.category,

            currentPrice:
              product.price===null
                ?null
                :Number(
                    product.price
                  ),

            reason:
              "No existe costo CENADA normalizado para este producto dentro del ciclo.",

            lastCenada
          };
        }
      );

    return NextResponse.json({
      success:true,

      run:{
        id:
          Number(
            run.id
          ),

        cycleId,

        algorithmVersion:
          run.algorithm_version,

        status:
          run.status,

        productsProcessed:
          Number(
            run.products_processed
          ),

        recommendationsGenerated:
          Number(
            run.recommendations_generated
          ),

        startedAt:
          run.started_at,

        finishedAt:
          run.finished_at,

        publishedAt:
          run.published_at,

        publishedBy:
          run.published_by
      },

      cycle:
        cycleResult.data
          ?{
              id:
                Number(
                  cycleResult.data.id
                ),

              cycleDate:
                cycleResult.data
                  .cycle_date,

              status:
                cycleResult.data
                  .status,

              expectedBulletins:
                Number(
                  cycleResult.data
                    .expected_bulletins
                ),

              readyAt:
                cycleResult.data
                  .ready_at,

              completedAt:
                cycleResult.data
                  .completed_at
            }
          :null,

      summary:{
        products:
          Number(
            run.products_processed
          ),

        recommendations:
          recommendations.length,

        missing:
          normalizedMissing.length,

        pending:
          recommendations.filter(
            item=>
              item.status==="pending"
          ).length,

        requiresReview:
          recommendations.filter(
            item=>
              item.requiresReview
          ).length,

        withWalmart:
          recommendations.filter(
            item=>
              item.competitorPrice!==null
          ).length,

        withoutWalmart:
          recommendations.filter(
            item=>
              item.competitorPrice===null
          ).length,

        competitiveExceptions:
          recommendations.filter(
            item=>
              item.competitiveException
          ).length
      },

      recommendations,

      missingProducts:
        normalizedMissing
    });

  }catch(error){
    console.error(
      "ERROR CARGANDO PANEL DE PRECIOS:",
      error
    );

    return NextResponse.json(
      {
        success:false,

        error:
          error instanceof Error
            ?error.message
            :"Error cargando recomendaciones"
      },
      {
        status:500
      }
    );
  }
}