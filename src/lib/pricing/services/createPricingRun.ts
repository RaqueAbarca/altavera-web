import { supabaseAdmin } from "@/lib/supabaseAdmin";

import {
  buildPricingPreview
} from "./buildPricingPreview";

import {
  assertCenadaCycleReady,
  getLatestReadyCenadaCycle
} from "@/lib/pricing/cenada/cycle";

export async function createPricingRun(
  requestedCycleId?:number
){
  let cycleId:number;

  if(
    requestedCycleId!==undefined
  ){
    cycleId=
      requestedCycleId;

  }else{
    const latest=
      await getLatestReadyCenadaCycle();

    if(
      !latest
    ){
      throw new Error(
        "No existe ningún ciclo CENADA listo para procesar"
      );
    }

    cycleId=
      Number(
        latest.id
      );
  }

  /*
   * El ciclo describe las fuentes CENADA
   * disponibles.
   *
   * No cambiaremos su estado al ejecutar
   * el algoritmo. Así puede reutilizarse
   * para nuevas corridas.
   */
  await assertCenadaCycleReady(
    cycleId
  );

  let runId:
    number|null=
      null;

  try{
    const preview=
      await buildPricingPreview({
        cycleId,

        applyStabilityThreshold:
          true
      });

    const {
      data:run,
      error:runError
    }=await supabaseAdmin
      .from(
        "pricing_runs"
      )
      .insert({
        cycle_id:
          cycleId,

        bulletin_number:
          `CENADA-CYCLE-${cycleId}`,

        algorithm_version:
          "v2.4",

        status:
          "running",

        products_processed:
          preview
            .summary
            .products,

        recommendations_generated:
          0
      })
      .select(
        "id"
      )
      .single();

    if(
      runError
    ){
      throw runError;
    }

    runId=
      Number(
        run.id
      );

    const rows=
      preview
        .recommendations
        .map(
          item=>{
            if(
              item.result
                .currentPrice===
              null
            ){
              throw new Error(
                `El producto ${item.productName} no tiene precio actual`
              );
            }

            const unchanged=
              Math.abs(
                item.result.recommendedPrice-
                item.result.currentPrice
              )<0.005;

            return{
              run_id:
                runId,

              product_id:
                item.productId,

              current_price:
                item.result
                  .currentPrice,

              cenada_price:
                item.result
                  .cenadaCost,

              effective_cost:
                item.result
                  .effectiveCost,

              competitor_price:
                item.result
                  .competitorPrice,

              /*
               * minimum_price se conserva
               * como el piso NORMAL.
               */
              minimum_price:
                item.result
                  .minimumPrice,

              standard_minimum_margin:
                item.result
                  .minimumMargin,

              competitive_minimum_margin:
                item.result
                  .competitiveMinimumMargin,

              competitive_minimum_price:
                item.result
                  .competitiveMinimumPrice,

              minimum_allowed_price:
                item.result
                  .minimumAllowedPrice,

              minimum_margin_used:
                item.result
                  .minimumMarginUsed,

              competitive_exception:
                item.result
                  .competitiveExceptionApplied,

              target_price:
                item.result
                  .targetPrice,

              fallback_target_price:
                item.result
                  .fallbackTargetPrice,

              recommended_price:
                item.result
                  .recommendedPrice,

              applied_margin:
                item.result
                  .appliedMargin,

              discount_used:
                item.result
                  .discountUsed,

              requires_review:
                unchanged
                  ?false
                  :item.result
                    .requiresReview,

              reason:
                item.result
                  .reason,

              approved_price:
                unchanged
                  ?item.result.currentPrice
                  :null,

              decision_type:
                unchanged
                  ?"keep_current"
                  :null,

              approved_at:
                unchanged
                  ?new Date().toISOString()
                  :null,

              approved_by:
                null,

              status:
                unchanged
                  ?"kept_current"
                  :"pending"
            };
          }
        );

    if(
      rows.length>0
    ){
      const {
        error
      }=await supabaseAdmin
        .from(
          "price_recommendations"
        )
        .insert(
          rows
        );

      if(
        error
      ){
        throw error;
      }
    }

    /*
     * Refuerzo de seguridad para las filas
     * cuyo precio recomendado no cambia.
     *
     * Ya se insertan como kept_current, pero
     * volvemos a fijar explícitamente el estado
     * después del INSERT y comprobamos el
     * resultado en base de datos. Así un Run no
     * puede quedar con 80 precios iguales como
     * "pending" sin que lo detectemos.
     */
    const unchangedProductIds=
      preview
        .recommendations
        .filter(
          item=>
            item.result.currentPrice!==null&&
            Math.abs(
              item.result.recommendedPrice-
              item.result.currentPrice
            )<0.005
        )
        .map(
          item=>
            item.productId
        );

    if(
      unchangedProductIds.length>0
    ){
      const approvedAt=
        new Date()
          .toISOString();

      const {
        error:autoKeepError
      }=await supabaseAdmin
        .from(
          "price_recommendations"
        )
        .update({
          status:
            "kept_current",

          decision_type:
            "keep_current",

          approved_at:
            approvedAt,

          approved_by:
            null,

          requires_review:
            false
        })
        .eq(
          "run_id",
          runId
        )
        .in(
          "product_id",
          unchangedProductIds
        );

      if(
        autoKeepError
      ){
        throw autoKeepError;
      }

      const {
        data:autoKeptRows,
        error:autoKeepCheckError
      }=await supabaseAdmin
        .from(
          "price_recommendations"
        )
        .select(`
          product_id,
          current_price,
          approved_price,
          decision_type,
          status
        `)
        .eq(
          "run_id",
          runId
        )
        .in(
          "product_id",
          unchangedProductIds
        );

      if(
        autoKeepCheckError
      ){
        throw autoKeepCheckError;
      }

      const invalidAutoKept=
        (autoKeptRows??[])
          .filter(
            row=>
              row.status!==
                "kept_current"||
              row.decision_type!==
                "keep_current"||
              Number(
                row.approved_price
              )!==
                Number(
                  row.current_price
                )
          );

      if(
        (autoKeptRows??[]).length!==
          unchangedProductIds.length||
        invalidAutoKept.length>0
      ){
        throw new Error(
          "No se pudieron cerrar automáticamente todas las recomendaciones sin cambios"
        );
      }
    }

    const finishedAt=
      new Date()
        .toISOString();

    const {
      error:updateError
    }=await supabaseAdmin
      .from(
        "pricing_runs"
      )
      .update({
        status:
          "completed",

        recommendations_generated:
          rows.length,

        finished_at:
          finishedAt
      })
      .eq(
        "id",
        runId
      );

    if(
      updateError
    ){
      throw updateError;
    }

    /*
     * IMPORTANTE:
     * pricing_cycles permanece READY.
     *
     * El estado completed pertenece
     * al pricing_run, no a la fuente.
     */

    return{
      runId,

      cycleId,

      status:
        "completed",

      summary:{
        ...preview.summary,

        saved:
          rows.length,

        autoKept:
          unchangedProductIds.length,

        pending:
          rows.length-
          unchangedProductIds.length
      },

      skipped:
        preview.skipped
    };

  }catch(error){
    if(
      runId!==null
    ){
      await supabaseAdmin
        .from(
          "pricing_runs"
        )
        .update({
          status:
            "failed",

          finished_at:
            new Date()
              .toISOString()
        })
        .eq(
          "id",
          runId
        );
    }

    throw error;
  }
}