"use client";

import {
  useEffect,
  useMemo,
  useState
} from "react";

import { supabase } from "@/lib/supabase";

import {
  suggestWalmartCandidatesForProduct,
  WalmartCandidate
} from "@/lib/pricing/walmart/suggestWalmartCandidatesForProduct";

type Product={
  id:number;
  name:string;
  unit:string|null;
};

type WalmartProduct={
  id:number;
  name:string;
  raw_price:number|null;
  validation_status:string|null;
  measurement_unit:string|null;
  quantity_text:string|null;
};

type WalmartMatch={
  competitor_product_id:number;
  product_id:number|null;
  action:"use"|"ignore";
  verified:boolean;
};

export default function WalmartByAltaveraList(){
  const [products,setProducts]=
    useState<Product[]>([]);

  const [walmartProducts,setWalmartProducts]=
    useState<WalmartProduct[]>([]);

  const [matches,setMatches]=
    useState<WalmartMatch[]>([]);

  const [search,setSearch]=
    useState("");

  const [loading,setLoading]=
    useState(true);

  const [workingId,setWorkingId]=
    useState<number|null>(null);

  const [message,setMessage]=
    useState("");

  useEffect(()=>{
    loadData();
  },[]);

  async function loadData(){
    setLoading(true);

    try{
      const {data:walmartCompetitor,error:walmartCompetitorError}=
        await supabase
          .from("competitors")
          .select("id")
          .eq("name","Walmart")
          .eq("enabled",true)
          .maybeSingle();

      if(walmartCompetitorError){
        throw walmartCompetitorError;
      }

      if(!walmartCompetitor){
        throw new Error("No existe un competidor Walmart habilitado");
      }

      const {data:latestRun,error:latestRunError}=
        await supabase
          .from("competitor_update_runs")
          .select("id")
          .eq("competitor_id",walmartCompetitor.id)
          .eq("status","success")
          .not("reference_region_id","is",null)
          .order("started_at",{ascending:false})
          .limit(1)
          .maybeSingle();

      if(latestRunError){
        throw latestRunError;
      }

      const [productsResult,walmartResult]=await Promise.all([
        supabase
          .from("products")
          .select("id,name,unit")
          .order("name"),

        latestRun
          ?supabase
            .from("competitor_products")
            .select(`
              id,
              name,
              raw_price,
              validation_status,
              measurement_unit,
              quantity_text
            `)
            .eq("competitor_id",walmartCompetitor.id)
            .eq("last_update_run_id",latestRun.id)
            .not("raw_price","is",null)
            .eq("validation_status","valid")
            .order("name")
          :Promise.resolve({data:[],error:null})
      ]);

      if(productsResult.error){
        throw productsResult.error;
      }

      if(walmartResult.error){
        throw walmartResult.error;
      }

      const activeWalmartProducts=
        (walmartResult.data??[]) as WalmartProduct[];

      const activeIds=activeWalmartProducts.map(item=>item.id);
      let activeMatches:WalmartMatch[]=[];

      if(activeIds.length>0){
        const {data:matchesData,error:matchesError}=
          await supabase
            .from("competitor_product_matches")
            .select(`
              competitor_product_id,
              product_id,
              action,
              verified
            `)
            .in("competitor_product_id",activeIds);

        if(matchesError){
          throw matchesError;
        }

        activeMatches=(matchesData??[]) as WalmartMatch[];
      }

      setProducts((productsResult.data??[]) as Product[]);
      setWalmartProducts(activeWalmartProducts);
      setMatches(activeMatches);

      if(!latestRun){
        setMessage(
          "Todavía no existe una actualización regional exitosa de Walmart."
        );
      }
    }catch(error){
      console.error(
        "Error cargando matching por Altavera:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error cargando productos"
      );
    }finally{
      setLoading(false);
    }
  }

  const visibleProducts=
    useMemo(()=>{
      const value=
        search.trim().toLowerCase();

      if(!value){
        return products;
      }

      return products.filter(
        product=>
          product.name
            .toLowerCase()
            .includes(value)
      );
    },[
      products,
      search
    ]);

  function getExistingMatches(
    productId:number
  ){
    return matches.filter(
      match=>
        match.product_id===productId&&
        match.action==="use"
    );
  }

  function getCandidates(
    product:Product
    ){
    /*
    * Si ya tomamos una decisión sobre un
    * producto Walmart, no debe volver a
    * aparecer como candidato.
    *
    * Esto incluye:
    * - asociados
    * - ignorados
    */
    const unavailableIds=
        new Set(
        matches.map(
            match=>
            match.competitor_product_id
        )
        );

    const available=
        walmartProducts.filter(
        walmart=>
            !unavailableIds.has(
            walmart.id
            )
        );

    return suggestWalmartCandidatesForProduct(
        product,
        available,
        5
    );
    }

  async function asociar(
    product:Product,
    candidate:WalmartCandidate
  ){
    setWorkingId(
      candidate.competitorProductId
    );

    setMessage("");

    try{
      const response=
        await fetch(
          "/api/walmart/assign",
          {
            method:"POST",
            headers:{
              "Content-Type":
                "application/json"
            },
            body:JSON.stringify({
              competitorProductId:
                candidate.competitorProductId,

              productId:
                product.id
            })
          }
        );

      const data=
        await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "No se pudo asociar"
        );
      }

      /*
       * Intentamos verificar automáticamente
       * la conversión después de asociar.
       */
      await fetch(
        "/api/walmart/auto-verify",
        {
          method:"POST"
        }
      );

      setMessage(
        `${candidate.name} asociado con ${product.name}.`
      );

      await loadData();

    }catch(error){
      console.error(
        "Error asociando candidato Walmart:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error asociando producto"
      );
    }finally{
      setWorkingId(null);
    }
  }

  if(loading){
    return(
      <p>
        Cargando productos Altavera...
      </p>
    );
  }

  return(
    <div className="walmart-altavera-panel">

      <h3 className="section-title">
        Referencias Walmart por producto Altavera
      </h3>

      <p className="walmart-description">
        Buscá cada producto de Altavera
        y seleccioná su referencia comparable
        en Walmart.
      </p>

      <input
        className="walmart-search"
        placeholder="Buscar producto Altavera..."
        value={search}
        onChange={
          e=>setSearch(
            e.target.value
          )
        }
      />

      {
        message&&(
          <p className="walmart-message">
            {message}
          </p>
        )
      }

      <div className="walmart-altavera-list">

        {
          visibleProducts.map(
            product=>{

              const existingMatches=
                getExistingMatches(
                  product.id
                );

              const candidates=
                getCandidates(
                  product
                );

              return(
                <div
                  className="walmart-altavera-item"
                  key={product.id}
                >

                  <div className="walmart-altavera-title">

                    <strong>
                      {product.name}
                    </strong>

                    <span>
                      {product.unit??"—"}
                    </span>

                  </div>

                  {
                    existingMatches.length>0&&(
                      <div className="walmart-existing-match">

                        Referencias asociadas:{" "}
                        {existingMatches.length}

                      </div>
                    )
                  }

                  {
                    candidates.length===0
                      ?(
                        <p className="walmart-no-candidates">
                          Sin candidatos claros.
                        </p>
                      )
                      :(
                        <div className="walmart-candidate-list">

                          {
                            candidates.map(
                              candidate=>(
                                <div
                                  className="walmart-candidate"
                                  key={
                                    candidate.competitorProductId
                                  }
                                >

                                  <div>

                                    <strong>
                                      {candidate.score}%
                                    </strong>

                                    {" "}

                                    {candidate.name}

                                    <div className="walmart-candidate-meta">

                                      {
                                        candidate.rawPrice!==null
                                          ?`₡${Number(
                                              candidate.rawPrice
                                            ).toLocaleString(
                                              "es-CR"
                                            )}`
                                          :"Sin precio"
                                      }

                                      {" · "}

                                      {
                                        candidate.measurementUnit??
                                        "—"
                                      }

                                      {
                                        candidate.quantityText
                                          ?` · ${candidate.quantityText}`
                                          :""
                                      }

                                    </div>

                                  </div>

                                  <button
                                    type="button"
                                    className="success-button"
                                    disabled={
                                      workingId===
                                      candidate.competitorProductId
                                    }
                                    onClick={()=>
                                      asociar(
                                        product,
                                        candidate
                                      )
                                    }
                                  >
                                    Asociar
                                  </button>

                                </div>
                              )
                            )
                          }

                        </div>
                      )
                  }

                </div>
              );
            }
          )
        }

      </div>

    </div>
  );
}