"use client";

import {
  useEffect,
  useRef,
  useState
} from "react";

import { supabase } from "@/lib/supabase";

import CenadaPendingList from "./CenadaPendingList";
import WalmartMatchingList from "./WalmartMatchingList";
import WalmartByAltaveraList from "./WalmartByAltaveraList";
import PricingRecommendationsPanel from "./PricingRecommendationsPanel";

import "./precios.css";

type Product={
  id:number;
  name:string;
};

type CenadaPrice={
  id:number;
  date:string;
  unit:string|null;
  cenada_unit:string|null;
  mode_price:number;
  conversion_factor:number|null;
  price_per_unit:number|null;
  products:{
    name:string;
  }|null;
};

type PdfFileResult={
  name:string;
  success:boolean;
  rows:number;
  results?:number;
  bulletinType?:string;
  bulletinDate?:string;
  error?:string;
};

type CycleSource={
  bulletinType:string;
  bulletinDate:string;
  filename:string;
  reused:boolean;
};

type PdfResponse={
  success:boolean;
  processingSuccess?:boolean;
  cycleId?:number;
  cycleDate?:string|null;
  cycleStatus?:string;
  cycleReused?:boolean;
  readyForPricingRun?:boolean;
  completedBulletins?:number;
  expectedBulletins?:number;
  missingBulletins?:string[];
  sources?:CycleSource[];
  totalFiles?:number;
  successfulFiles?:number;
  failedFiles?:number;
  totalRows?:number;
  totalResults?:number;
  files?:PdfFileResult[];
  error?:string;
};

type WalmartResponse={
  success?:boolean;
  saved?:number;
  prices?:{
    saved?:number;
  };
  conversions?:{
    verified?:number;
    pending?:number;
  };
  error?:string;
};

type PricingRunResponse={
  success:boolean;
  reused?:boolean;
  runId?:number;
  cycleId?:number;
  summary?:{
    saved?:number;
    autoKept?:number;
    pending?:number;
  };
  error?:string;
};

type PriceTab=
  |"recommendations"
  |"cenada"
  |"walmart"
  |"advanced";

const MAX_PDFS=10;

const BULLETIN_LABELS:
  Record<string,string>={
    plaza:"Plaza",
    fruta_importada:
      "Fruta importada",
    aromaticos_gourmet:
      "Aromáticos y gourmet"
  };

function bulletinLabel(
  value:string
){
  return BULLETIN_LABELS[value]??
    value;
}

export default function PreciosPage(){
  const [
    products,
    setProducts
  ]=useState<Product[]>([]);

  const [
    prices,
    setPrices
  ]=useState<CenadaPrice[]>([]);

  const [
    productId,
    setProductId
  ]=useState<number|null>(
    null
  );

  const [
    plazaDate,
    setPlazaDate
  ]=useState(
    new Date()
      .toISOString()
      .split("T")[0]
  );

  const [
    minimumPrice,
    setMinimumPrice
  ]=useState("");

  const [
    maximumPrice,
    setMaximumPrice
  ]=useState("");

  const [
    modePrice,
    setModePrice
  ]=useState("");

  const [
    averagePrice,
    setAveragePrice
  ]=useState("");

  const [
    unit,
    setUnit
  ]=useState("");

  const [
    resultadoPdf,
    setResultadoPdf
  ]=useState("");

  const [
    resultadoManual,
    setResultadoManual
  ]=useState("");

  const [
    pdfFiles,
    setPdfFiles
  ]=useState<File[]>([]);

  const [
    procesandoPdf,
    setProcesandoPdf
  ]=useState(false);

  const [
    activeTab,
    setActiveTab
  ]=useState<PriceTab>(
    "recommendations"
  );

  const [
    pricingRefreshKey,
    setPricingRefreshKey
  ]=useState(0);

  const fileInputRef=
    useRef<HTMLInputElement|null>(
      null
    );

  useEffect(()=>{
    loadProducts();
    loadPrices();
  },[]);

  async function loadProducts(){
    const {
      data,
      error
    }=await supabase
      .from("products")
      .select("id,name")
      .order("name");

    if(error){
      console.error(error);
      return;
    }

    setProducts(
      data??[]
    );
  }

  async function loadPrices(){
    const {
      data,
      error
    }=await supabase
      .from("cenada_prices")
      .select(`
        *,
        products(
          name
        )
      `)
      .order(
        "created_at",
        {
          ascending:false
        }
      );

    if(error){
      console.error(error);
      return;
    }

    setPrices(
      data??[]
    );
  }

  function limpiarFormulario(){
    setProductId(null);
    setMinimumPrice("");
    setMaximumPrice("");
    setModePrice("");
    setAveragePrice("");
    setUnit("");

    setPlazaDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );
  }

  async function guardarPrecio(){
    setResultadoManual("");

    if(!productId){
      setResultadoManual(
        "Seleccione un producto"
      );
      return;
    }

    if(
      !unit||
      !minimumPrice||
      !maximumPrice||
      !modePrice||
      !averagePrice
    ){
      setResultadoManual(
        "Complete todos los campos"
      );
      return;
    }

    const minimum=
      Number(minimumPrice);

    const maximum=
      Number(maximumPrice);

    const mode=
      Number(modePrice);

    const average=
      Number(averagePrice);

    if(
      !Number.isFinite(minimum)||
      !Number.isFinite(maximum)||
      !Number.isFinite(mode)||
      !Number.isFinite(average)
    ){
      setResultadoManual(
        "Los precios deben ser números válidos"
      );
      return;
    }

    try{
      const response=
        await fetch(
          "/api/cenada/save",
          {
            method:"POST",
            headers:{
              "Content-Type":
                "application/json"
            },
            body:JSON.stringify({
              productId,
              row:{
                source:"cenada",
                bulletinType:
                  "Carga manual",
                bulletinDate:
                  plazaDate,
                plazaDate,
                productName:
                  products.find(
                    product=>
                      product.id===
                      productId
                  )?.name??"",
                unit,
                minimumPrice:
                  minimum,
                maximumPrice:
                  maximum,
                modePrice:mode,
                averagePrice:
                  average,
                page:0,
                row:0
              }
            })
          }
        );

      const result=
        await response.json();

      if(!response.ok){
        throw new Error(
          result.error??
          "No se pudo guardar el precio CENADA"
        );
      }

      setResultadoManual(
        "Precio CENADA guardado correctamente"
      );

      limpiarFormulario();
      await loadPrices();

    }catch(error){
      console.error(
        "Error registrando precio manual:",
        error
      );

      setResultadoManual(
        error instanceof Error
          ?error.message
          :"Error registrando precio"
      );
    }
  }

  function buildCenadaSummary(
    data:PdfResponse
  ){
    const sources=
      Array.isArray(data.sources)
        ?data.sources
        :[];

    if(sources.length===0){
      return "";
    }

    return sources
      .map(
        source=>
          `${bulletinLabel(
            source.bulletinType
          )}: ${source.bulletinDate}${
            source.reused
              ?" (reutilizado)"
              :""
          }`
      )
      .join(" · ");
  }

  async function procesarPdf(){
    setResultadoPdf("");

    if(pdfFiles.length===0){
      setResultadoPdf(
        "Seleccione al menos un PDF"
      );
      return;
    }

    if(
      pdfFiles.length>
      MAX_PDFS
    ){
      setResultadoPdf(
        `Puede procesar un máximo de ${MAX_PDFS} boletines a la vez`
      );
      return;
    }

    setProcesandoPdf(true);

    try{
      setResultadoPdf(
        `1/3 Procesando ${pdfFiles.length} boletín${
          pdfFiles.length===1
            ?""
            :"es"
        } CENADA...`
      );

      const formData=
        new FormData();

      pdfFiles.forEach(
        file=>{
          formData.append(
            "files",
            file
          );
        }
      );

      const cenadaResponse=
        await fetch(
          "/api/cenada/parse",
          {
            method:"POST",
            body:formData
          }
        );

      const cenadaData:
        PdfResponse=
          await cenadaResponse.json();

      if(!cenadaResponse.ok){
        throw new Error(
          cenadaData.error??
          "Error procesando boletines CENADA"
        );
      }

      await loadPrices();

      const files=
        Array.isArray(
          cenadaData.files
        )
          ?cenadaData.files
          :[];

      const failed=
        files.filter(
          file=>!file.success
        );

      if(failed.length>0){
        const errors=
          failed
            .map(
              file=>
                `${file.name}: ${
                  file.error??
                  "Error desconocido"
                }`
            )
            .join(" | ");

        setResultadoPdf(
          `CENADA guardó los archivos válidos, pero no se generó un nuevo Run porque ${failed.length} PDF(s) fallaron. ${errors}`
        );
        return;
      }

      if(
        !cenadaData.readyForPricingRun||
        !cenadaData.cycleId
      ){
        const missing=
          cenadaData
            .missingBulletins??[];

        setResultadoPdf(
          `CENADA fue procesado, pero no hay suficientes fuentes para preparar precios.${
            missing.length>0
              ?` Faltan: ${missing.map(bulletinLabel).join(", ")}.`
              :""
          }`
        );
        return;
      }

      const cenadaSummary=
        buildCenadaSummary(
          cenadaData
        );

      setResultadoPdf(
        `2/3 CENADA listo con ciclo #${cenadaData.cycleId}. Actualizando Walmart... ${cenadaSummary}`
      );

      const walmartResponse=
        await fetch(
          "/api/walmart/update",
          {
            method:"POST"
          }
        );

      const walmartData:
        WalmartResponse=
          await walmartResponse.json();

      if(!walmartResponse.ok){
        throw new Error(
          walmartData.error??
          "CENADA quedó listo, pero Walmart no pudo actualizarse"
        );
      }

      setResultadoPdf(
        `3/3 Walmart actualizado. Generando recomendaciones V2.4 para el ciclo #${cenadaData.cycleId}...`
      );

      const runResponse=
        await fetch(
          "/api/pricing/run",
          {
            method:"POST",
            headers:{
              "Content-Type":
                "application/json"
            },
            body:JSON.stringify({
              cycleId:
                cenadaData.cycleId,
              reuseRecent:true
            })
          }
        );

      const runData:
        PricingRunResponse=
          await runResponse.json();

      if(!runResponse.ok){
        throw new Error(
          runData.error??
          "No se pudo generar la corrida de precios"
        );
      }

      setResultadoPdf(
        `Listo. Ciclo #${cenadaData.cycleId} preparado con ${cenadaSummary}. Walmart sincronizó ${walmartData.prices?.saved??0} precios. Run #${runData.runId??"—"}${
          runData.reused
            ?" reutilizado porque acababa de generarse"
            :" generado"
        }. ${
          runData.summary?.autoKept!==undefined&&
          runData.summary?.pending!==undefined
            ?`${runData.summary.autoKept} precios quedaron iguales y se cerraron automáticamente; ${runData.summary.pending} requieren revisión.`
            :"Revise únicamente los cambios pendientes y publique cuando esté conforme."
        }`
      );

      setPdfFiles([]);

      if(fileInputRef.current){
        fileInputRef.current.value="";
      }

      setPricingRefreshKey(
        current=>
          current+1
      );

      setActiveTab(
        "recommendations"
      );

    }catch(error){
      console.error(
        "Error preparando precios:",
        error
      );

      setResultadoPdf(
        error instanceof Error
          ?error.message
          :"Error preparando precios"
      );

    }finally{
      setProcesandoPdf(false);
    }
  }

  return(
    <main className="prices-container">

      <header className="prices-page-header">
        <div>
          <h1 className="prices-title">
            Administración de precios
          </h1>

          <p className="prices-page-description">
            Cargue los boletines nuevos y Altavera preparará el ciclo, actualizará Walmart y generará el Run de precios. La publicación sigue siendo manual.
          </p>
        </div>
      </header>

      <section className="weekly-pricing-box">
        <div className="weekly-pricing-header">
          <div>
            <span className="weekly-pricing-kicker">
              Actualización semanal
            </span>

            <h2>
              Preparar precios
            </h2>

            <p>
              Puede subir varios PDFs, incluso más de uno del mismo tipo. Para cada fuente se utilizará automáticamente el boletín más reciente disponible.
            </p>
          </div>

          <div className="weekly-pricing-flow">
            <span>CENADA</span>
            <span>Walmart</span>
            <span>Run V2.4</span>
            <span>Revisión</span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept="application/pdf"
          multiple
          disabled={procesandoPdf}
          onChange={
            event=>{
              const files=
                Array.from(
                  event.target
                    .files??[]
                );

              if(
                files.length>
                MAX_PDFS
              ){
                setPdfFiles([]);

                setResultadoPdf(
                  `Seleccione un máximo de ${MAX_PDFS} archivos PDF`
                );

                event.target.value="";
                return;
              }

              setPdfFiles(files);
              setResultadoPdf("");
            }
          }
        />

        {
          pdfFiles.length>0&&(
            <div className="selected-files">
              <p className="file-name">
                {pdfFiles.length} archivo{pdfFiles.length===1?"":"s"} seleccionado{pdfFiles.length===1?"":"s"}
              </p>

              <ul>
                {
                  pdfFiles.map(
                    (
                      file,
                      index
                    )=>(
                      <li
                        key={
                          `${file.name}-${index}`
                        }
                      >
                        {file.name}
                      </li>
                    )
                  )
                }
              </ul>
            </div>
          )
        }

        <button
          className="primary-button weekly-pricing-button"
          onClick={procesarPdf}
          disabled={
            procesandoPdf||
            pdfFiles.length===0
          }
        >
          {
            procesandoPdf
              ?"Preparando precios..."
              :"Procesar boletines y preparar precios"
          }
        </button>

        {
          resultadoPdf&&(
            <p className="result-message">
              {resultadoPdf}
            </p>
          )
        }
      </section>

      <nav className="pricing-main-tabs">
        <button
          type="button"
          className={
            activeTab==="recommendations"
              ?"pricing-main-tab active"
              :"pricing-main-tab"
          }
          onClick={()=>
            setActiveTab(
              "recommendations"
            )
          }
        >
          Recomendaciones
        </button>

        <button
          type="button"
          className={
            activeTab==="cenada"
              ?"pricing-main-tab active"
              :"pricing-main-tab"
          }
          onClick={()=>
            setActiveTab("cenada")
          }
        >
          CENADA
        </button>

        <button
          type="button"
          className={
            activeTab==="walmart"
              ?"pricing-main-tab active"
              :"pricing-main-tab"
          }
          onClick={()=>
            setActiveTab("walmart")
          }
        >
          Walmart
        </button>

        <button
          type="button"
          className={
            activeTab==="advanced"
              ?"pricing-main-tab active"
              :"pricing-main-tab"
          }
          onClick={()=>
            setActiveTab("advanced")
          }
        >
          Avanzado
        </button>
      </nav>

      <section className="pricing-tab-content">
        {
          activeTab==="recommendations"&&(
            <PricingRecommendationsPanel
              key={pricingRefreshKey}
            />
          )
        }

        {
          activeTab==="cenada"&&(
            <div className="pricing-tab-stack">
              <CenadaPendingList/>

              <details className="pricing-tool-details">
                <summary>
                  Ver últimos precios CENADA
                </summary>

                <div className="pricing-tool-content table-box compact-table-box">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Fecha</th>
                        <th>Presentación CENADA</th>
                        <th>Precio CENADA</th>
                        <th>Unidad Altavera</th>
                        <th>Costo normalizado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {
                        prices.map(
                          price=>(
                            <tr key={price.id}>
                              <td>
                                {price.products?.name??"Sin producto"}
                              </td>
                              <td>
                                {price.date}
                              </td>
                              <td>
                                {price.cenada_unit??"—"}
                              </td>
                              <td>
                                ₡{Number(price.mode_price).toLocaleString("es-CR")}
                              </td>
                              <td>
                                {price.unit??"Pendiente"}
                              </td>
                              <td>
                                {
                                  price.price_per_unit!==null
                                    ?`₡${Number(price.price_per_unit).toLocaleString(
                                        "es-CR",
                                        {
                                          minimumFractionDigits:2,
                                          maximumFractionDigits:2
                                        }
                                      )}`
                                    :"Pendiente de conversión"
                                }
                              </td>
                            </tr>
                          )
                        )
                      }
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )
        }

        {
          activeTab==="walmart"&&(
            <div className="pricing-tab-stack">
              <details
                className="pricing-tool-details"
                open
              >
                <summary>
                  Productos Walmart pendientes de asociación
                </summary>

                <div className="pricing-tool-content">
                  <WalmartMatchingList/>
                </div>
              </details>

              <details className="pricing-tool-details">
                <summary>
                  Asociaciones Walmart por producto Altavera
                </summary>

                <div className="pricing-tool-content">
                  <WalmartByAltaveraList/>
                </div>
              </details>
            </div>
          )
        }

        {
          activeTab==="advanced"&&(
            <section className="manual-price-box advanced-price-box">
              <div>
                <h3 className="section-title">
                  Registrar precio CENADA manual
                </h3>

                <p className="advanced-description">
                  Use esta herramienta solo cuando necesite registrar una referencia manual fuera del flujo normal de boletines.
                </p>
              </div>

              <select
                value={productId??""}
                onChange={
                  event=>{
                    const value=
                      event.target.value;

                    setProductId(
                      value
                        ?Number(value)
                        :null
                    );
                  }
                }
              >
                <option value="">
                  Seleccionar producto
                </option>

                {
                  products.map(
                    product=>(
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name}
                      </option>
                    )
                  )
                }
              </select>

              <label>
                Fecha plaza
              </label>

              <input
                type="date"
                value={plazaDate}
                onChange={
                  event=>
                    setPlazaDate(
                      event.target.value
                    )
                }
              />

              <input
                placeholder="Unidad"
                value={unit}
                onChange={
                  event=>
                    setUnit(
                      event.target.value
                    )
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio mínimo"
                value={minimumPrice}
                onChange={
                  event=>
                    setMinimumPrice(
                      event.target.value
                    )
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio máximo"
                value={maximumPrice}
                onChange={
                  event=>
                    setMaximumPrice(
                      event.target.value
                    )
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio moda"
                value={modePrice}
                onChange={
                  event=>
                    setModePrice(
                      event.target.value
                    )
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio promedio"
                value={averagePrice}
                onChange={
                  event=>
                    setAveragePrice(
                      event.target.value
                    )
                }
              />

              <button
                className="success-button"
                onClick={guardarPrecio}
              >
                Guardar precio CENADA
              </button>

              {
                resultadoManual&&(
                  <p className="result-message">
                    {resultadoManual}
                  </p>
                )
              }
            </section>
          )
        }
      </section>

    </main>
  );
}
