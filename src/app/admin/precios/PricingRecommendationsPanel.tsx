"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

type Recommendation={
  id:number;
  runId:number;
  productId:number;
  productName:string;
  unit:string|null;
  category:string|null;

  currentPrice:number;
  cenadaPrice:number|null;
  effectiveCost:number|null;
  competitorPrice:number|null;

  minimumPrice:number|null;
  standardMinimumMargin:number;

  competitiveMinimumPrice:number|null;
  competitiveMinimumMargin:number;

  minimumAllowedPrice:number|null;
  minimumMarginUsed:number;
  competitiveException:boolean;

  targetPrice:number|null;
  fallbackTargetPrice:number|null;
  recommendedPrice:number;

  approvedPrice:number|null;
  decisionType:string|null;

  appliedMargin:number|null;
  discountUsed:number|null;

  status:string;
  requiresReview:boolean;
  reason:string|null;

  approvedAt:string|null;
  approvedBy:string|null;
  publishedAt:string|null;
  publishedBy:string|null;
};

type LastCenada={
  date:string;
  bulletinNumber:string|null;
  cenadaName:string|null;
  cenadaUnit:string|null;
  modePrice:number|null;
  pricePerUnit:number|null;
};

type MissingProduct={
  productId:number;
  productName:string;
  unit:string|null;
  category:string|null;
  currentPrice:number|null;
  reason:string;
  lastCenada:LastCenada|null;
};

type PanelData={
  success:boolean;

  run:{
    id:number;
    cycleId:number;
    algorithmVersion:string;
    status:string;
    productsProcessed:number;
    recommendationsGenerated:number;
    startedAt:string|null;
    finishedAt:string|null;
    publishedAt:string|null;
    publishedBy:string|null;
  }|null;

  cycle:{
    id:number;
    cycleDate:string|null;
    status:string;
    expectedBulletins:number;
    readyAt:string|null;
    completedAt:string|null;
  }|null;

  summary:{
    products:number;
    recommendations:number;
    missing:number;
    pending:number;
    requiresReview:number;
    withWalmart:number;
    withoutWalmart:number;
    competitiveExceptions:number;
  };

  recommendations:Recommendation[];
  missingProducts:MissingProduct[];
};

type Filter=
  |"all"
  |"pending"
  |"review"
  |"approved"
  |"kept"
  |"competitive"
  |"missing";

type Decision=
  |"approve"
  |"keep_current"
  |"custom"
  |"reset";

function formatPrice(
  value:number|null
){
  if(value===null){
    return "—";
  }

  return `₡${Number(value).toLocaleString(
    "es-CR",
    {
      minimumFractionDigits:0,
      maximumFractionDigits:2
    }
  )}`;
}

function formatPercent(
  value:number|null
){
  if(value===null){
    return "—";
  }

  return `${(
    Number(value)*100
  ).toFixed(1)}%`;
}

function formatDate(
  value:string|null
){
  if(!value){
    return "—";
  }

  const parts=
    value.split("-");

  if(parts.length!==3){
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTime(
  value:string|null
){
  if(!value){
    return "—";
  }

  const date=
    new Date(value);

  if(
    Number.isNaN(
      date.getTime()
    )
  ){
    return value;
  }

  return date.toLocaleString(
    "es-CR",
    {
      dateStyle:"medium",
      timeStyle:"short"
    }
  );
}

function getPriceChange(
  currentPrice:number,
  recommendedPrice:number
){
  if(currentPrice<=0){
    return null;
  }

  return(
    recommendedPrice-
    currentPrice
  )/currentPrice;
}

function getChangeLabel(
  value:number|null
){
  if(value===null){
    return "—";
  }

  if(
    Math.abs(value)<0.0001
  ){
    return "Sin cambio";
  }

  if(value>0){
    return `Sube ${(
      value*100
    ).toFixed(1)}%`;
  }

  return `Baja ${(
    Math.abs(value)*100
  ).toFixed(1)}%`;
}

function calculateMargin(
  price:number,
  effectiveCost:number|null
){
  if(
    effectiveCost===null||
    price<=0
  ){
    return null;
  }

  return(
    price-
    effectiveCost
  )/price;
}

export default function PricingRecommendationsPanel(){
  const [
    data,
    setData
  ]=useState<PanelData|null>(
    null
  );

  const [
    loading,
    setLoading
  ]=useState(true);

  const [
    error,
    setError
  ]=useState("");

  const [
    message,
    setMessage
  ]=useState("");

  const [
    filter,
    setFilter
  ]=useState<Filter>(
    "pending"
  );

  const [
    search,
    setSearch
  ]=useState("");

  const [
    workingId,
    setWorkingId
  ]=useState<number|null>(
    null
  );

  const [
    customOpenId,
    setCustomOpenId
  ]=useState<number|null>(
    null
  );

  const [
    customPrices,
    setCustomPrices
  ]=useState<
    Record<number,string>
  >({});

  const [
    publishing,
    setPublishing
  ]=useState(false);

  async function loadData(
    showLoading=true
  ){
    if(showLoading){
      setLoading(true);
    }

    setError("");

    try{
      const response=
        await fetch(
          "/api/pricing/recommendations",
          {
            method:"GET",
            cache:"no-store"
          }
        );

      const result=
        await response.json();

      if(!response.ok){
        throw new Error(
          result.error??
          "No se pudo cargar el panel"
        );
      }

      setData(result);

    }catch(error){
      console.error(
        "Error cargando recomendaciones:",
        error
      );

      setError(
        error instanceof Error
          ?error.message
          :"Error cargando recomendaciones"
      );

    }finally{
      if(showLoading){
        setLoading(false);
      }
    }
  }

  useEffect(()=>{
    loadData();
  },[]);

  async function saveDecision(
    recommendation:Recommendation,
    decision:Decision,
    customPrice?:number
  ){
    if(
      data?.run?.publishedAt
    ){
      setMessage(
        "Este Run ya fue publicado y sus decisiones no pueden modificarse."
      );

      return;
    }

    setWorkingId(
      recommendation.id
    );

    setMessage("");

    try{
      const response=
        await fetch(
          "/api/pricing/decision",
          {
            method:"POST",

            headers:{
              "Content-Type":
                "application/json"
            },

            body:JSON.stringify({
              recommendationId:
                recommendation.id,

              decision,

              customPrice
            })
          }
        );

      const result=
        await response.json();

      if(!response.ok){
        throw new Error(
          result.error??
          "No se pudo guardar la decisión"
        );
      }

      if(decision==="approve"){
        setMessage(
          `${recommendation.productName}: precio recomendado aprobado.`
        );

      }else if(
        decision==="keep_current"
      ){
        setMessage(
          `${recommendation.productName}: se mantendrá el precio actual.`
        );

      }else if(
        decision==="custom"
      ){
        setMessage(
          `${recommendation.productName}: precio personalizado guardado en ${formatPrice(customPrice??null)}.`
        );

      }else{
        setMessage(
          `${recommendation.productName}: decisión restablecida.`
        );
      }

      setCustomOpenId(null);

      await loadData(false);

    }catch(error){
      console.error(
        "Error guardando decisión:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error guardando decisión"
      );

    }finally{
      setWorkingId(null);
    }
  }

  const approvedCount=
    useMemo(
      ()=>
        data?.recommendations.filter(
          item=>
            item.status==="approved"
        ).length??0,
      [data]
    );

  const keptCount=
    useMemo(
      ()=>
        data?.recommendations.filter(
          item=>
            item.status==="kept_current"
        ).length??0,
      [data]
    );

  const pendingCount=
    useMemo(
      ()=>
        data?.recommendations.filter(
          item=>
            item.status==="pending"
        ).length??0,
      [data]
    );

  const reviewedCount=
    approvedCount+
    keptCount;

  async function publishPrices(){
    const currentRun=
      data?.run;

    if(!currentRun){
      return;
    }

    if(currentRun.publishedAt){
      setMessage(
        `El Run #${currentRun.id} ya fue publicado.`
      );

      return;
    }

    if(pendingCount>0){
      setMessage(
        `Todavía faltan ${pendingCount} recomendaciones por revisar.`
      );

      return;
    }

    const confirmed=
      window.confirm(
        `¿Publicar los precios del Run #${currentRun.id}?\n\n`+
        `Precios aprobados: ${approvedCount}\n`+
        `Mantener precio actual: ${keptCount}\n`+
        `Sin recomendación: ${data?.summary.missing??0}\n\n`+
        `Esta acción modificará los precios utilizados por el catálogo.`
      );

    if(!confirmed){
      return;
    }

    setPublishing(true);
    setMessage("");

    try{
      const response=
        await fetch(
          "/api/pricing/publish",
          {
            method:"POST",

            headers:{
              "Content-Type":
                "application/json"
            },

            body:JSON.stringify({
              runId:
                currentRun.id
            })
          }
        );

      const result=
        await response.json();

      if(!response.ok){
        throw new Error(
          result.error??
          "No se pudieron publicar los precios"
        );
      }

      const publication=
        result.result;

      if(
        publication?.alreadyPublished
      ){
        setMessage(
          `El Run #${currentRun.id} ya había sido publicado.`
        );

      }else{
        setMessage(
          `Precios publicados correctamente. `+
          `${publication?.changed??0} productos cambiaron de precio y `+
          `${publication?.unchanged??0} conservaron su precio.`
        );
      }

      await loadData(false);

    }catch(error){
      console.error(
        "Error publicando precios:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"No se pudieron publicar los precios"
      );

    }finally{
      setPublishing(false);
    }
  }

  const visibleRecommendations=
    useMemo(
      ()=>{
        if(!data){
          return[];
        }

        const normalizedSearch=
          search
            .trim()
            .toLowerCase();

        return data
          .recommendations
          .filter(
            item=>{
              if(
                normalizedSearch&&
                !item.productName
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  )
              ){
                return false;
              }

              if(filter==="pending"){
                return(
                  item.status==="pending"
                );
              }

              if(filter==="review"){
                return(
                  item.requiresReview
                );
              }

              if(filter==="approved"){
                return(
                  item.status==="approved"
                );
              }

              if(filter==="kept"){
                return(
                  item.status==="kept_current"
                );
              }

              if(filter==="competitive"){
                return(
                  item.competitiveException
                );
              }

              if(filter==="missing"){
                return false;
              }

              return true;
            }
          );
      },
      [
        data,
        filter,
        search
      ]
    );

  const visibleMissing=
    useMemo(
      ()=>{
        if(!data){
          return[];
        }

        if(
          filter!=="all"&&
          filter!=="missing"
        ){
          return[];
        }

        const normalizedSearch=
          search
            .trim()
            .toLowerCase();

        return data
          .missingProducts
          .filter(
            item=>
              !normalizedSearch||
              item.productName
                .toLowerCase()
                .includes(
                  normalizedSearch
                )
          );
      },
      [
        data,
        filter,
        search
      ]
    );

  if(loading){
    return(
      <div className="pricing-panel">

        <h2 className="pricing-panel-title">
          Recomendaciones de precios
        </h2>

        <p>
          Cargando última corrida de precios...
        </p>

      </div>
    );
  }

  if(error){
    return(
      <div className="pricing-panel">

        <h2 className="pricing-panel-title">
          Recomendaciones de precios
        </h2>

        <p className="pricing-panel-error">
          {error}
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={()=>
            loadData()
          }
        >
          Intentar de nuevo
        </button>

      </div>
    );
  }

  if(
    !data||
    !data.run
  ){
    return(
      <div className="pricing-panel">

        <h2 className="pricing-panel-title">
          Recomendaciones de precios
        </h2>

        <p className="pricing-empty-state">
          Todavía no existe una corrida oficial de precios asociada a un ciclo CENADA.
        </p>

      </div>
    );
  }

  /*
   * Guardamos la referencia después del guard.
   * TypeScript sabe que `run` ya no puede ser null,
   * incluso dentro de callbacks como `.map()`.
   */
  const run=
    data.run;

  return(
    <div className="pricing-panel">

      <div className="pricing-panel-header">

        <div>

          <h2 className="pricing-panel-title">
            Recomendaciones de precios
          </h2>

          <p className="pricing-panel-subtitle">
            Ciclo #{run.cycleId}
            {" · "}
            {formatDate(
              data.cycle?.cycleDate??
              null
            )}
            {" · "}
            Run #{run.id}
            {" · "}
            {run.algorithmVersion.toUpperCase()}
          </p>

        </div>

        <button
          type="button"
          className="pricing-refresh-button"
          onClick={()=>
            loadData()
          }
        >
          Actualizar panel
        </button>

      </div>

      <div className="pricing-summary-grid">

        <div className="pricing-summary-card">
          <span>
            Productos
          </span>

          <strong>
            {data.summary.products}
          </strong>
        </div>

        <div className="pricing-summary-card">
          <span>
            Pendientes
          </span>

          <strong>
            {pendingCount}
          </strong>
        </div>

        <div className="pricing-summary-card approved">
          <span>
            Aprobados
          </span>

          <strong>
            {approvedCount}
          </strong>
        </div>

        <div className="pricing-summary-card kept">
          <span>
            Mantener actual
          </span>

          <strong>
            {keptCount}
          </strong>
        </div>

        <div className="pricing-summary-card warning">
          <span>
            Excepción competitiva
          </span>

          <strong>
            {data.summary.competitiveExceptions}
          </strong>
        </div>

        <div className="pricing-summary-card missing">
          <span>
            Sin recomendación
          </span>

          <strong>
            {data.summary.missing}
          </strong>
        </div>

      </div>

      <div className="pricing-progress">

        <div>
          <strong>
            {reviewedCount}
          </strong>
          {" de "}
          <strong>
            {data.summary.recommendations}
          </strong>
          {" recomendaciones revisadas"}
        </div>

        <div className="pricing-progress-bar">

          <div
            className="pricing-progress-value"
            style={{
              width:
                data.summary.recommendations>0
                  ?`${(
                      reviewedCount/
                      data.summary.recommendations
                    )*100}%`
                  :"0%"
            }}
          />

        </div>

      </div>

      <div
        className={
          run.publishedAt
            ?"pricing-publish-box published"
            :"pricing-publish-box"
        }
      >

        {
          run.publishedAt
            ?(
              <div className="pricing-published-info">

                <strong>
                  Precios publicados
                </strong>

                <span>
                  Este Run ya fue aplicado al catálogo.
                </span>

                <small>
                  {formatDateTime(
                    run.publishedAt
                  )}
                </small>

              </div>
            )
            :(
              <>
                <div className="pricing-publish-info">

                  <strong>
                    Publicar precios
                  </strong>

                  {
                    pendingCount>0
                      ?(
                        <span>
                          Faltan {pendingCount} decisiones antes de poder publicar.
                        </span>
                      )
                      :(
                        <span>
                          Todas las recomendaciones fueron revisadas. Los precios están listos para publicarse.
                        </span>
                      )
                  }

                </div>

                <button
                  type="button"
                  className="pricing-publish-button"
                  disabled={
                    publishing||
                    pendingCount>0
                  }
                  onClick={
                    publishPrices
                  }
                >
                  {
                    publishing
                      ?"Publicando..."
                      :"Publicar precios revisados"
                  }
                </button>
              </>
            )
        }

      </div>

      {
        message&&(
          <p className="pricing-decision-message">
            {message}
          </p>
        )
      }

      <div className="pricing-toolbar">

        <div className="pricing-filter-tabs">

          <button
            type="button"
            className={
              filter==="all"
                ?"pricing-filter active"
                :"pricing-filter"
            }
            onClick={()=>
              setFilter("all")
            }
          >
            Todas ({data.summary.products})
          </button>

          <button
            type="button"
            className={
              filter==="pending"
                ?"pricing-filter active"
                :"pricing-filter"
            }
            onClick={()=>
              setFilter("pending")
            }
          >
            Pendientes ({pendingCount})
          </button>

          <button
            type="button"
            className={
              filter==="competitive"
                ?"pricing-filter active"
                :"pricing-filter"
            }
            onClick={()=>
              setFilter("competitive")
            }
          >
            Excepción 20% ({
              data.summary.competitiveExceptions
            })
          </button>

          <button
            type="button"
            className={
              filter==="review"
                ?"pricing-filter active"
                :"pricing-filter"
            }
            onClick={()=>
              setFilter("review")
            }
          >
            Revisión ({
              data.summary.requiresReview
            })
          </button>

          <button
            type="button"
            className={
              filter==="approved"
                ?"pricing-filter active"
                :"pricing-filter"
            }
            onClick={()=>
              setFilter("approved")
            }
          >
            Aprobadas ({approvedCount})
          </button>

          <button
            type="button"
            className={
              filter==="kept"
                ?"pricing-filter active"
                :"pricing-filter"
            }
            onClick={()=>
              setFilter("kept")
            }
          >
            Mantener ({keptCount})
          </button>

          <button
            type="button"
            className={
              filter==="missing"
                ?"pricing-filter active"
                :"pricing-filter"
            }
            onClick={()=>
              setFilter("missing")
            }
          >
            Sin recomendación ({
              data.summary.missing
            })
          </button>

        </div>

        <input
          type="text"
          className="pricing-search"
          placeholder="Buscar producto..."
          value={search}
          onChange={
            event=>
              setSearch(
                event.target.value
              )
          }
        />

      </div>

      {
        visibleRecommendations.length===0&&
        visibleMissing.length===0&&(
          <p className="pricing-empty-state">
            No hay productos que coincidan con este filtro.
          </p>
        )
      }

      {
        visibleRecommendations.length>0&&(
          <div className="pricing-recommendation-list">

            {
              visibleRecommendations.map(
                item=>{
                  const change=
                    getPriceChange(
                      item.currentPrice,
                      item.recommendedPrice
                    );

                  const minimumAllowed=
                    item.minimumAllowedPrice??
                    item.minimumPrice;

                  const canKeepCurrent=
                    minimumAllowed===null||
                    item.currentPrice>=
                    minimumAllowed;

                  const working=
                    workingId===
                    item.id;

                  const customValue=
                    customPrices[
                      item.id
                    ]??"";

                  const customNumeric=
                    Number(
                      customValue
                    );

                  const customValid=
                    customValue!==""&&
                    Number.isFinite(
                      customNumeric
                    )&&
                    customNumeric>0&&
                    (
                      minimumAllowed===null||
                      customNumeric>=
                      minimumAllowed
                    );

                  const customMargin=
                    Number.isFinite(
                      customNumeric
                    )&&
                    customNumeric>0
                      ?calculateMargin(
                          customNumeric,
                          item.effectiveCost
                        )
                      :null;

                  const finalDecisionPrice=
                    item.approvedPrice??
                    (
                      item.status==="kept_current"
                        ?item.currentPrice
                        :item.recommendedPrice
                    );

                  return(
                    <article
                      key={item.id}
                      className={
                        item.competitiveException
                          ?"pricing-recommendation-card competitive-exception"
                          :item.requiresReview
                            ?"pricing-recommendation-card needs-review"
                            :"pricing-recommendation-card"
                      }
                    >

                      <div className="pricing-card-header">

                        <div>

                          <h3>
                            {item.productName}
                          </h3>

                          <p>
                            {item.unit??"Sin unidad"}

                            {
                              item.category
                                ?` · ${item.category}`
                                :""
                            }
                          </p>

                        </div>

                        <div className="pricing-badges">

                          {
                            item.competitiveException&&(
                              <span className="pricing-badge competitive">
                                Excepción 20%
                              </span>
                            )
                          }

                          {
                            item.requiresReview&&(
                              <span className="pricing-badge review">
                                Revisión
                              </span>
                            )
                          }

                          {
                            item.status==="pending"&&(
                              <span className="pricing-badge pending">
                                Pendiente
                              </span>
                            )
                          }

                          {
                            item.status==="approved"&&(
                              <span className="pricing-badge approved">
                                {
                                  item.decisionType==="custom"
                                    ?"Precio manual"
                                    :"Aprobado"
                                }
                              </span>
                            )
                          }

                          {
                            item.status==="kept_current"&&(
                              <span className="pricing-badge kept">
                                Mantener actual
                              </span>
                            )
                          }

                          {
                            item.competitorPrice!==null&&(
                              <span className="pricing-badge walmart">
                                Walmart
                              </span>
                            )
                          }

                          {
                            run.publishedAt&&(
                              <span className="pricing-badge published">
                                Publicado
                              </span>
                            )
                          }

                        </div>

                      </div>

                      {
                        item.competitiveException&&(
                          <div className="pricing-competitive-notice">

                            <strong>
                              Excepción competitiva
                            </strong>

                            <span>
                              Walmart está por debajo del precio necesario para conservar el margen normal de{" "}
                              {formatPercent(
                                item.standardMinimumMargin
                              )}. Para este producto únicamente, el piso permitido baja a{" "}
                              {formatPercent(
                                item.competitiveMinimumMargin
                              )}.
                            </span>

                          </div>
                        )
                      }

                      <div className="pricing-values-grid">

                        <div className="pricing-value">
                          <span>
                            {run.publishedAt
                              ?"Precio anterior"
                              :"Actual"}
                          </span>

                          <strong>
                            {formatPrice(
                              item.currentPrice
                            )}
                          </strong>
                        </div>

                        <div className="pricing-value">
                          <span>
                            CENADA
                          </span>

                          <strong>
                            {formatPrice(
                              item.cenadaPrice
                            )}
                          </strong>
                        </div>

                        <div className="pricing-value">
                          <span>
                            Walmart
                          </span>

                          <strong>
                            {formatPrice(
                              item.competitorPrice
                            )}
                          </strong>
                        </div>

                        <div className="pricing-value">
                          <span>
                            Costo efectivo
                          </span>

                          <strong>
                            {formatPrice(
                              item.effectiveCost
                            )}
                          </strong>
                        </div>

                        <div className="pricing-value">
                          <span>
                            Mínimo normal{" "}
                            {formatPercent(
                              item.standardMinimumMargin
                            )}
                          </span>

                          <strong>
                            {formatPrice(
                              item.minimumPrice
                            )}
                          </strong>
                        </div>

                        {
                          item.competitiveException&&(
                            <div className="pricing-value competitive-floor">

                              <span>
                                Mínimo permitido{" "}
                                {formatPercent(
                                  item.competitiveMinimumMargin
                                )}
                              </span>

                              <strong>
                                {formatPrice(
                                  item.minimumAllowedPrice
                                )}
                              </strong>

                            </div>
                          )
                        }

                        <div className="pricing-value recommended">
                          <span>
                            Recomendado
                          </span>

                          <strong>
                            {formatPrice(
                              item.recommendedPrice
                            )}
                          </strong>
                        </div>

                      </div>

                      <div className="pricing-analysis-row">

                        <div>
                          <span>
                            Margen recomendado
                          </span>

                          <strong>
                            {formatPercent(
                              item.appliedMargin
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Descuento Walmart
                          </span>

                          <strong>
                            {formatPercent(
                              item.discountUsed
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Cambio
                          </span>

                          <strong
                            className={
                              change===null||
                              Math.abs(change)<0.0001
                                ?"neutral"
                                :change>0
                                  ?"increase"
                                  :"decrease"
                            }
                          >
                            {getChangeLabel(
                              change
                            )}
                          </strong>
                        </div>

                      </div>

                      {
                        item.reason&&(
                          <p className="pricing-reason">
                            {item.reason}
                          </p>
                        )
                      }

                      {
                        item.status==="pending"&&
                        !run.publishedAt
                          ?(
                            <>
                              <div className="pricing-decision-actions">

                                <button
                                  type="button"
                                  className="pricing-approve-button"
                                  disabled={working}
                                  onClick={()=>
                                    saveDecision(
                                      item,
                                      "approve"
                                    )
                                  }
                                >
                                  {
                                    working
                                      ?"Guardando..."
                                      :`Aprobar ${formatPrice(
                                          item.recommendedPrice
                                        )}`
                                  }
                                </button>

                                <button
                                  type="button"
                                  className="pricing-keep-button"
                                  disabled={
                                    working||
                                    !canKeepCurrent
                                  }
                                  onClick={()=>
                                    saveDecision(
                                      item,
                                      "keep_current"
                                    )
                                  }
                                >
                                  Mantener{" "}
                                  {formatPrice(
                                    item.currentPrice
                                  )}
                                </button>

                                <button
                                  type="button"
                                  className="pricing-custom-button"
                                  disabled={working}
                                  onClick={()=>{
                                    if(
                                      customOpenId===
                                      item.id
                                    ){
                                      setCustomOpenId(
                                        null
                                      );

                                      return;
                                    }

                                    setCustomOpenId(
                                      item.id
                                    );

                                    setCustomPrices(
                                      current=>({
                                        ...current,

                                        [item.id]:
                                          String(
                                            item.recommendedPrice
                                          )
                                      })
                                    );
                                  }}
                                >
                                  Asignar otro precio
                                </button>

                                {
                                  !canKeepCurrent&&(
                                    <span className="pricing-unsafe-current">
                                      El precio actual está por debajo del mínimo permitido.
                                    </span>
                                  )
                                }

                              </div>

                              {
                                customOpenId===item.id&&(
                                  <div className="pricing-custom-box">

                                    <div>

                                      <label>
                                        Precio personalizado
                                      </label>

                                      <div className="pricing-custom-input-wrap">

                                        <span>
                                          ₡
                                        </span>

                                        <input
                                          type="number"
                                          min={
                                            minimumAllowed??
                                            0
                                          }
                                          step="50"
                                          value={customValue}
                                          onChange={
                                            event=>
                                              setCustomPrices(
                                                current=>({
                                                  ...current,

                                                  [item.id]:
                                                    event.target.value
                                                })
                                              )
                                          }
                                        />

                                      </div>

                                    </div>

                                    <div className="pricing-custom-metrics">

                                      <div>
                                        <span>
                                          Margen estimado
                                        </span>

                                        <strong>
                                          {formatPercent(
                                            customMargin
                                          )}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>
                                          Mínimo permitido
                                        </span>

                                        <strong>
                                          {formatPrice(
                                            minimumAllowed
                                          )}
                                        </strong>
                                      </div>

                                    </div>

                                    {
                                      customValue!==""&&
                                      !customValid&&(
                                        <p className="pricing-custom-error">
                                          El precio debe ser igual o mayor a{" "}
                                          {formatPrice(
                                            minimumAllowed
                                          )}.
                                        </p>
                                      )
                                    }

                                    <button
                                      type="button"
                                      className="pricing-custom-save"
                                      disabled={
                                        working||
                                        !customValid
                                      }
                                      onClick={()=>
                                        saveDecision(
                                          item,
                                          "custom",
                                          customNumeric
                                        )
                                      }
                                    >
                                      Guardar precio personalizado
                                    </button>

                                  </div>
                                )
                              }

                            </>
                          )
                          :(
                            <div className="pricing-reviewed-actions">

                              <span>
                                {
                                  item.decisionType==="custom"
                                    ?`Precio manual aprobado: ${formatPrice(
                                        finalDecisionPrice
                                      )}`
                                    :item.status==="approved"
                                      ?`Se publicará ${formatPrice(
                                          finalDecisionPrice
                                        )}`
                                      :`Se conservará ${formatPrice(
                                          finalDecisionPrice
                                        )}`
                                }
                              </span>

                              {
                                run.publishedAt
                                  ?(
                                    <span className="pricing-published-badge">
                                      Publicado
                                    </span>
                                  )
                                  :(
                                    <button
                                      type="button"
                                      disabled={working}
                                      onClick={()=>
                                        saveDecision(
                                          item,
                                          "reset"
                                        )
                                      }
                                    >
                                      {
                                        working
                                          ?"Guardando..."
                                          :"Cambiar decisión"
                                      }
                                    </button>
                                  )
                              }

                            </div>
                          )
                      }

                    </article>
                  );
                }
              )
            }

          </div>
        )
      }

      {
        visibleMissing.length>0&&(
          <div className="pricing-missing-section">

            <h3>
              Sin recomendación automática
            </h3>

            <p className="pricing-missing-description">
              Estos productos no tuvieron un costo CENADA normalizado disponible dentro del ciclo utilizado por este run.
            </p>

            <div className="pricing-missing-list">

              {
                visibleMissing.map(
                  item=>(
                    <article
                      key={item.productId}
                      className="pricing-missing-card"
                    >

                      <div>

                        <h4>
                          {item.productName}
                        </h4>

                        <p>
                          {item.unit??"Sin unidad"}
                        </p>

                      </div>

                      <div className="pricing-missing-current">

                        <span>
                          Precio actual
                        </span>

                        <strong>
                          {formatPrice(
                            item.currentPrice
                          )}
                        </strong>

                      </div>

                      <div className="pricing-missing-history">

                        <span>
                          Última referencia CENADA
                        </span>

                        {
                          item.lastCenada
                            ?(
                              <>
                                <strong>
                                  {formatPrice(
                                    item.lastCenada.pricePerUnit??
                                    item.lastCenada.modePrice
                                  )}
                                </strong>

                                <small>
                                  {formatDate(
                                    item.lastCenada.date
                                  )}

                                  {
                                    item.lastCenada.bulletinNumber
                                      ?` · ${item.lastCenada.bulletinNumber}`
                                      :""
                                  }
                                </small>
                              </>
                            )
                            :(
                              <strong>
                                Sin referencia previa
                              </strong>
                            )
                        }

                      </div>

                      <p className="pricing-missing-reason">
                        {item.reason}
                      </p>

                    </article>
                  )
                )
              }

            </div>

          </div>
        )
      }

      {
        pendingCount===0&&
        data.summary.recommendations>0&&
        !run.publishedAt&&(
          <div className="pricing-review-complete">

            <strong>
              Revisión completa.
            </strong>

            <span>
              Todas las recomendaciones tienen una decisión y el Run está listo para publicación.
            </span>

          </div>
        )
      }

    </div>
  );
}
