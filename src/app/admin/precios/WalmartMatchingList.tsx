"use client";

import { useEffect, useMemo, useState } from "react";
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
  current_price:number|null;
  regular_price:number|null;
  discount_percent:number|null;
  previous_current_price:number|null;
  price_change_percent:number|null;
  validation_status:string|null;
  validation_warning:string|null;
  reference_label:string|null;
  reference_region_id:string|null;
  selected_seller_id:string|null;
  selected_seller_name:string|null;
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
  const [conversionFactors,setConversionFactors]=useState<Record<number,string>>({});
  const [conversionConfidence,setConversionConfidence]=useState<Record<number,"exact"|"measured"|"estimated">>({});

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
      const response=await fetch(
        "/api/walmart/admin-data",
        {cache:"no-store"}
      );

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "Error cargando productos Walmart"
        );
      }

      const activeWalmartProducts=
        (data.walmartProducts??[]) as WalmartProduct[];

      setWalmartProducts(activeWalmartProducts);
      setProducts((data.products??[]) as Product[]);
      setMatches((data.matches??[]) as WalmartMatch[]);

      if(!data.latestRunId){
        setMessage(
          "Todavía no existe una actualización regional exitosa de Walmart."
        );
      }else{
        setMessage("");
      }
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

        const referenceLabel=
          data.reference?.label??
          "referencia configurada";

        const sellerNames=
          Array.isArray(data.reference?.sellers)
            ?data.reference.sellers
              .map((seller:{name?:string})=>seller.name)
              .filter(Boolean)
              .join(", ")
            :"";

        const validation=data.validation??{};
        const blocked=data.prices?.blocked??0;

        setMessage(
          `Walmart actualizado: ${data.downloaded??data.saved??0} productos obtenidos y ${data.saved??0} guardados. `+
          (data.walmartReportedTotal!=null?`Walmart reportó ${data.walmartReportedTotal} productos para esta búsqueda regional${data.pagesFetched?` en ${data.pagesFetched} página${data.pagesFetched===1?"":"s"}`:""}. `:"")+
          `Referencia: ${referenceLabel}. `+
          (sellerNames?`Walmart reportó: ${sellerNames}. `:"")+
          `${validation.valid??0} datos válidos, `+
          `${validation.suspicious??0} cambios de precio sospechosos, `+
          `${validation.presentationChanged??0} cambios de presentación y `+
          `${validation.noPrice??0} sin precio. `+
          `${blocked} referencias quedaron bloqueadas por seguridad. `+
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

  async function aprobarPrecioSospechoso(
    item:WalmartProduct
  ){
    setWorkingId(item.id);
    setMessage("");

    try{
      const response=await fetch(
        "/api/walmart/approve-observation",
        {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({competitorProductId:item.id})
        }
      );

      const data=await response.json();

      if(!response.ok){
        throw new Error(data.error??"No se pudo aprobar el precio");
      }

      setMessage(`${item.name}: cambio de precio aprobado.`);
      await loadData();
    }catch(error){
      setMessage(
        error instanceof Error
          ?error.message
          :"Error aprobando precio Walmart"
      );
    }finally{
      setWorkingId(null);
    }
  }

  async function verificarConversionManual(
    item:WalmartProduct
  ){
    const factor=Number(conversionFactors[item.id]);

    if(!Number.isFinite(factor)||factor<=0){
      setMessage("Ingrese un factor de conversión mayor que 0.");
      return;
    }

    setWorkingId(item.id);
    setMessage("");

    try{
      const response=await fetch(
        "/api/walmart/verify",
        {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            competitorProductId:item.id,
            conversionFactor:factor,
            confidence:conversionConfidence[item.id]??"exact"
          })
        }
      );

      const data=await response.json();

      if(!response.ok){
        throw new Error(data.error??"No se pudo verificar la conversión");
      }

      setMessage(`${item.name}: conversión verificada.`);
      await loadData();
    }catch(error){
      setMessage(
        error instanceof Error
          ?error.message
          :"Error verificando conversión Walmart"
      );
    }finally{
      setWorkingId(null);
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
            La referencia de precios es Walmart Alajuela — Río Segundo (Las Cañas).
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
          Pendientes regionales ({counts.pending})
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
          Asociados activos ({counts.matched})
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
                      Precio actual: {formatPrice(
                        item.current_price??item.raw_price
                      )}
                    </span>

                    {
                      item.regular_price!==null&&
                      item.current_price!==null&&
                      item.regular_price>item.current_price&&
                      (
                        <span>
                          Regular: {formatPrice(item.regular_price)}
                          {item.discount_percent!==null
                            ?` · Oferta -${Number(item.discount_percent).toLocaleString("es-CR")}%`
                            :""}
                        </span>
                      )
                    }

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

                    {
                      item.selected_seller_name&&(
                        <span>
                          Tienda/seller reportado:{" "}
                          {item.selected_seller_name}
                        </span>
                      )
                    }

                    <span>
                      Última observación:{" "}
                      {new Date(item.last_seen_at).toLocaleString("es-CR")}
                    </span>

                  </div>

                  {
                    item.validation_status&&
                    item.validation_status!=="valid"&&(
                      <div className="walmart-validation-warning">
                        <strong>Revisión requerida:</strong>{" "}
                        {item.validation_warning??item.validation_status}
                        {
                          item.price_change_percent!==null&&(
                            <> Cambio: {Number(item.price_change_percent).toLocaleString("es-CR")}%.</>
                          )
                        }
                        {
                          item.validation_status==="suspicious_price"&&(
                            <button
                              type="button"
                              className="success-button"
                              disabled={workingId===item.id}
                              onClick={()=>aprobarPrecioSospechoso(item)}
                            >
                              Aprobar este precio
                            </button>
                          )
                        }
                      </div>
                    )
                  }

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

                      {
                        match&&!match.verified&&(
                          <div className="walmart-manual-conversion">
                            <p>
                              Si la equivalencia no puede comprobarse automáticamente, puede revisarla manualmente. El precio normalizado se calcula como precio Walmart ÷ factor.
                            </p>
                            <input
                              type="number"
                              min="0.0001"
                              step="0.0001"
                              placeholder="Factor de conversión"
                              value={conversionFactors[item.id]??""}
                              onChange={event=>
                                setConversionFactors(current=>({
                                  ...current,
                                  [item.id]:event.target.value
                                }))
                              }
                            />
                            <select
                              value={conversionConfidence[item.id]??"exact"}
                              onChange={event=>
                                setConversionConfidence(current=>({
                                  ...current,
                                  [item.id]:event.target.value as "exact"|"measured"|"estimated"
                                }))
                              }
                            >
                              <option value="exact">Exacta</option>
                              <option value="measured">Medida</option>
                              <option value="estimated">Estimada</option>
                            </select>
                            <button
                              type="button"
                              className="success-button"
                              disabled={workingId===item.id}
                              onClick={()=>verificarConversionManual(item)}
                            >
                              Verificar conversión
                            </button>
                          </div>
                        )
                      }

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