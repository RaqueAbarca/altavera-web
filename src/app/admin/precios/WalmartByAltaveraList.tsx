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
      const [
        productsResult,
        walmartResult,
        matchesResult
      ]=await Promise.all([
        supabase
          .from("products")
          .select("id,name,unit")
          .order("name"),

        supabase
          .from("competitor_products")
          .select(`
            id,
            name,
            raw_price,
            measurement_unit,
            quantity_text
          `)
          .not("raw_price","is",null)
          .order("name"),

        supabase
          .from("competitor_product_matches")
          .select(`
            competitor_product_id,
            product_id,
            action,
            verified
          `)
      ]);

      if(productsResult.error){
        throw productsResult.error;
      }

      if(walmartResult.error){
        throw walmartResult.error;
      }

      if(matchesResult.error){
        throw matchesResult.error;
      }

      setProducts(
        (productsResult.data??[]) as Product[]
      );

      setWalmartProducts(
        (walmartResult.data??[]) as WalmartProduct[]
      );

      setMatches(
        (matchesResult.data??[]) as WalmartMatch[]
      );

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