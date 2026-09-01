"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { suggestWalmartMatches } from "@/lib/pricing/walmart/suggestWalmartMatches";

type Product={
  id:number;
  name:string;
  unit:string|null;
};

type WalmartProduct={
  id:number;
  external_id:string;
  name:string;
  raw_price:number|null;
  measurement_unit:string|null;
  quantity_text:string|null;
  unit_multiplier:number|null;
  last_seen_at:string;
};

type WalmartMatch={
  competitor_product_id:number;
  product_id:number|null;
  action:"use"|"ignore";
  verified:boolean;
  conversion_factor:number|null;
};

type Filter="pending"|"matched"|"ignored";

export default function WalmartMatchingList(){
  const [walmartProducts,setWalmartProducts]=useState<WalmartProduct[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [matches,setMatches]=useState<WalmartMatch[]>([]);

  const [selectedProducts,setSelectedProducts]=useState<Record<number,string>>({});

  const [filter,setFilter]=useState<Filter>("pending");
  const [search,setSearch]=useState("");

  const [loading,setLoading]=useState(true);
  const [updating,setUpdating]=useState(false);
  const [workingId,setWorkingId]=useState<number|null>(null);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    loadData();
  },[]);

  async function loadData(){
    setLoading(true);

    try{
      const [
        walmartResult,
        productsResult,
        matchesResult
      ]=await Promise.all([
        supabase
          .from("competitor_products")
          .select(`
            id,
            external_id,
            name,
            raw_price,
            measurement_unit,
            quantity_text,
            unit_multiplier,
            last_seen_at
          `)
          .order("name"),

        supabase
          .from("products")
          .select("id,name,unit")
          .order("name"),

        supabase
          .from("competitor_product_matches")
          .select(`
            competitor_product_id,
            product_id,
            action,
            verified,
            conversion_factor
          `)
      ]);

      if(walmartResult.error){
        throw walmartResult.error;
      }

      if(productsResult.error){
        throw productsResult.error;
      }

      if(matchesResult.error){
        throw matchesResult.error;
      }

      setWalmartProducts(
        (walmartResult.data??[]) as WalmartProduct[]
      );

      setProducts(
        (productsResult.data??[]) as Product[]
      );

      setMatches(
        (matchesResult.data??[]) as WalmartMatch[]
      );
    }catch(error){
      console.error(
        "Error cargando panel Walmart:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error cargando productos Walmart"
      );
    }finally{
      setLoading(false);
    }
  }

  function getMatch(
    competitorProductId:number
  ){
    return matches.find(
      match=>
        match.competitor_product_id===
        competitorProductId
    );
  }

  function getStatus(
    competitorProductId:number
  ):Filter{
    const match=getMatch(
      competitorProductId
    );

    if(!match){
      return "pending";
    }

    if(match.action==="ignore"){
      return "ignored";
    }

    return "matched";
  }

  const counts=useMemo(()=>{
    let pending=0;
    let matched=0;
    let ignored=0;

    for(const item of walmartProducts){
      const status=getStatus(item.id);

      if(status==="pending"){
        pending++;
      }

      if(status==="matched"){
        matched++;
      }

      if(status==="ignored"){
        ignored++;
      }
    }

    return{
      pending,
      matched,
      ignored
    };
  },[
    walmartProducts,
    matches
  ]);

  const visibleProducts=useMemo(()=>{
    const normalizedSearch=
      search.trim().toLowerCase();

    return walmartProducts.filter(item=>{
      if(
        getStatus(item.id)!==filter
      ){
        return false;
      }

      if(!normalizedSearch){
        return true;
      }

      return item.name
        .toLowerCase()
        .includes(normalizedSearch);
    });
  },[
    walmartProducts,
    matches,
    filter,
    search
  ]);

  async function actualizarWalmart(){
    setUpdating(true);
    setMessage(
      "Actualizando productos Walmart..."
    );

    try{
      const response=
        await fetch(
          "/api/walmart/update",
          {
            method:"POST"
          }
        );

      const data=
        await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "No se pudo actualizar Walmart"
        );
      }

        const autoVerified=
        data.conversions?.verified??0;

        const pendingConversions=
        data.conversions?.pending??0;

        setMessage(
        `Walmart actualizado: ${data.saved??0} productos guardados. `+
        `${autoVerified} conversiones verificadas automáticamente. `+
        `${pendingConversions} conversiones siguen pendientes.`
        );

      await loadData();
    }catch(error){
      console.error(
        "Error actualizando Walmart:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error actualizando Walmart"
      );
    }finally{
      setUpdating(false);
    }
  }

  async function guardarRelacion(
    item:WalmartProduct
  ){
    const selected=
      selectedProducts[item.id];

    const productId=
      Number(selected);

    if(
      !Number.isInteger(productId)||
      productId<=0
    ){
      setMessage(
        `Seleccione un producto Altavera para ${item.name}`
      );
      return;
    }

    setWorkingId(item.id);
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
                item.id,
              productId
            })
          }
        );

      const data=
        await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "No se pudo asociar el producto"
        );
      }

      setSelectedProducts(
        current=>{
          const next={...current};
          delete next[item.id];
          return next;
        }
      );

      setMessage(
        `${item.name} asociado correctamente.`
      );

      await loadData();
    }catch(error){
      console.error(
        "Error asociando Walmart:",
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

  async function ignorarProducto(
    item:WalmartProduct
  ){
    setWorkingId(item.id);
    setMessage("");

    try{
      const response=
        await fetch(
          "/api/walmart/ignore",
          {
            method:"POST",
            headers:{
              "Content-Type":
                "application/json"
            },
            body:JSON.stringify({
              competitorProductId:
                item.id
            })
          }
        );

      const data=
        await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "No se pudo ignorar el producto"
        );
      }

      setSelectedProducts(
        current=>{
          const next={...current};
          delete next[item.id];
          return next;
        }
      );

      setMessage(
        `${item.name} fue ignorado.`
      );

      await loadData();
    }catch(error){
      console.error(
        "Error ignorando Walmart:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error ignorando producto"
      );
    }finally{
      setWorkingId(null);
    }
  }

  function getAltaveraProduct(
    productId:number|null
  ){
    if(!productId){
      return null;
    }

    return products.find(
      product=>
        product.id===productId
    )??null;
  }

  function formatPrice(
    value:number|null
  ){
    if(value===null){
      return "Sin precio";
    }

    return `₡${Number(value)
      .toLocaleString("es-CR")}`;
  }

  if(loading){
    return(
      <div className="walmart-panel">
        <h3 className="section-title">
          Walmart
        </h3>

        <p>
          Cargando productos Walmart...
        </p>
      </div>
    );
  }

  return(
    <div className="walmart-panel">

      <div className="walmart-header">

        <div>
          <h3 className="section-title">
            Walmart
          </h3>

          <p className="walmart-description">
            Asociá cada producto de Walmart
            con su equivalente en Altavera.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={actualizarWalmart}
          disabled={updating}
        >
          {
            updating
              ?"Actualizando Walmart..."
              :"Actualizar Walmart"
          }
        </button>

      </div>

      <div className="walmart-tabs">

        <button
          type="button"
          className={
            filter==="pending"
              ?"walmart-tab active"
              :"walmart-tab"
          }
          onClick={()=>
            setFilter("pending")
          }
        >
          Pendientes ({counts.pending})
        </button>

        <button
          type="button"
          className={
            filter==="matched"
              ?"walmart-tab active"
              :"walmart-tab"
          }
          onClick={()=>
            setFilter("matched")
          }
        >
          Asociados ({counts.matched})
        </button>

        <button
          type="button"
          className={
            filter==="ignored"
              ?"walmart-tab active"
              :"walmart-tab"
          }
          onClick={()=>
            setFilter("ignored")
          }
        >
          Ignorados ({counts.ignored})
        </button>

      </div>

      <input
        type="text"
        className="walmart-search"
        placeholder="Buscar producto de Walmart..."
        value={search}
        onChange={
          e=>setSearch(e.target.value)
        }
      />

      {
        message&&(
          <p className="walmart-message">
            {message}
          </p>
        )
      }

      <div className="walmart-list">

        {
          visibleProducts.length===0&&(
            <p>
              {
                filter==="pending"
                  ?"No hay productos pendientes."
                  :filter==="matched"
                    ?"No hay productos asociados."
                    :"No hay productos ignorados."
              }
            </p>
          )
        }

        {
          visibleProducts.map(item=>{

            const suggestions=
            suggestWalmartMatches(
                {
                id:item.id,
                name:item.name,
                measurement_unit:
                    item.measurement_unit,
                quantity_text:
                    item.quantity_text
                },
                products,
                3
            );

            const match=
              getMatch(item.id);

            const altaveraProduct=
              getAltaveraProduct(
                match?.product_id??null
              );

            return(
              <div
                className="walmart-item"
                key={item.id}
              >

                <div className="walmart-product-info">

                  <strong>
                    {item.name}
                  </strong>

                  <div className="walmart-product-meta">

                    <span>
                      {formatPrice(
                        item.raw_price
                      )}
                    </span>

                    <span>
                      Unidad Walmart:{" "}
                      {item.measurement_unit??"—"}
                    </span>

                    <span>
                      Presentación:{" "}
                      {item.quantity_text??"—"}
                    </span>

                    {
                      item.unit_multiplier!==null&&(
                        <span>
                          Multiplicador:{" "}
                          {item.unit_multiplier}
                        </span>
                      )
                    }

                  </div>

                </div>

                {
                filter==="pending"&&(
                    <div className="walmart-actions-container">

                    {
                        suggestions.length>0&&(
                        <div className="walmart-suggestions">

                            <span className="walmart-suggestions-label">
                            Sugerencias:
                            </span>

                            <div className="walmart-suggestion-list">

                            {
                                suggestions.map(
                                suggestion=>(
                                    <button
                                    key={suggestion.productId}
                                    type="button"
                                    className={
                                        suggestion.score>=80
                                        ?"walmart-suggestion high"
                                        :"walmart-suggestion"
                                    }
                                    onClick={()=>
                                        setSelectedProducts(
                                        current=>({
                                            ...current,
                                            [item.id]:
                                            String(
                                                suggestion.productId
                                            )
                                        })
                                        )
                                    }
                                    >
                                    <strong>
                                        {suggestion.score}%
                                    </strong>
                                    {" "}
                                    {suggestion.name}

                                    {
                                        suggestion.unit
                                        ?` · ${suggestion.unit}`
                                        :""
                                    }
                                    </button>
                                )
                                )
                            }

                            </div>

                        </div>
                        )
                    }

                    <div className="walmart-actions">

                        <select
                        value={
                            selectedProducts[
                            item.id
                            ]??""
                        }
                        onChange={
                            e=>
                            setSelectedProducts(
                                current=>({
                                ...current,
                                [item.id]:
                                    e.target.value
                                })
                            )
                        }
                        disabled={
                            workingId===item.id
                        }
                        >
                        <option value="">
                            Seleccionar producto Altavera
                        </option>

                        {
                            products.map(product=>(
                            <option
                                key={product.id}
                                value={product.id}
                            >
                                {product.name}
                                {
                                product.unit
                                    ?` — ${product.unit}`
                                    :""
                                }
                            </option>
                            ))
                        }

                        </select>

                        <button
                        type="button"
                        className="success-button"
                        onClick={()=>
                            guardarRelacion(item)
                        }
                        disabled={
                            workingId===item.id
                        }
                        >
                        Asociar
                        </button>

                        <button
                        type="button"
                        className="walmart-ignore-button"
                        onClick={()=>
                            ignorarProducto(item)
                        }
                        disabled={
                            workingId===item.id
                        }
                        >
                        Ignorar
                        </button>

                    </div>

                    </div>
                )
                }

                {
                  filter==="matched"&&(
                    <div className="walmart-match-result">

                      <strong>
                        Altavera:
                      </strong>{" "}

                      {
                        altaveraProduct
                          ?`${altaveraProduct.name} — ${altaveraProduct.unit??""}`
                          :"Producto no encontrado"
                      }

                      <div>
                        {
                          match?.verified
                            ?"Conversión verificada"
                            :"Conversión pendiente"
                        }
                      </div>

                    </div>
                  )
                }

                {
                  filter==="ignored"&&(
                    <div className="walmart-ignore-result">
                      Ignorado
                    </div>
                  )
                }

              </div>
            );
          })
        }

      </div>

    </div>
  );
}