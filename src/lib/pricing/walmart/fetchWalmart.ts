import type {
  WalmartFetchResult,
  WalmartRawProduct,
  WalmartReference,
  WalmartSellerReference
} from "./types";

const WALMART_ORIGIN="https://www.walmart.co.cr";

/*
 * Referencia competitiva de Altavera.
 *
 * Walmart Alajuela está en Río Segundo. Para resolver la región de VTEX
 * usamos primero el código postal del distrito (más estable que serializar
 * geocoordenadas en query string) y conservamos las coordenadas como
 * respaldo. Las variables de entorno permiten cambiar la referencia sin
 * tocar código.
 */
const REFERENCE_LABEL=
  process.env.WALMART_REFERENCE_LABEL?.trim()||
  "Walmart Alajuela — Río Segundo (Las Cañas)";

const REFERENCE_COUNTRY=
  process.env.WALMART_REFERENCE_COUNTRY?.trim()||
  "CRI";

const REFERENCE_POSTAL_CODE=
  process.env.WALMART_REFERENCE_POSTAL_CODE?.trim()||
  "20109";

const REFERENCE_LATITUDE=
  Number(process.env.WALMART_REFERENCE_LATITUDE??"10.00263");

const REFERENCE_LONGITUDE=
  Number(process.env.WALMART_REFERENCE_LONGITUDE??"-84.20602");

const SALES_CHANNEL=
  process.env.WALMART_SALES_CHANNEL?.trim()||
  "1";

type RegionResponse={
  id?:string;
  sellers?:Array<{
    id?:string;
    name?:string;
  }>;
};

type ProductSearchResponse={
  products?:WalmartRawProduct[];
  recordsFiltered?:number;
};

function assertReferenceCoordinates(){
  if(
    !Number.isFinite(REFERENCE_LATITUDE)||
    !Number.isFinite(REFERENCE_LONGITUDE)
  ){
    throw new Error(
      "La ubicación de referencia de Walmart no es válida. Revise WALMART_REFERENCE_LATITUDE y WALMART_REFERENCE_LONGITUDE."
    );
  }
}

function parseReference(
  data:unknown
):WalmartReference|null{
  const regions=Array.isArray(data)
    ?(data as RegionResponse[]).filter(region=>
      typeof region?.id==="string"&&
      region.id.length>0
    )
    :[];

  const selected=
    regions.find(region=>
      Array.isArray(region.sellers)&&
      region.sellers.length>0
    )??regions[0];

  if(!selected?.id){
    return null;
  }

  const sellers:WalmartSellerReference[]=
    (selected.sellers??[])
      .map(seller=>({
        id:String(seller.id??"").trim(),
        name:String(seller.name??seller.id??"").trim()
      }))
      .filter(seller=>seller.id.length>0);

  return{
    label:REFERENCE_LABEL,
    country:REFERENCE_COUNTRY,
    latitude:REFERENCE_LATITUDE,
    longitude:REFERENCE_LONGITUDE,
    regionId:selected.id,
    sellers
  };
}

async function readResponseDetail(response:Response){
  const text=await response.text().catch(()=>"");
  if(!text){
    return "sin detalle";
  }

  try{
    const parsed=JSON.parse(text) as {
      error?:{code?:string;message?:string};
      message?:string;
    };
    const code=parsed?.error?.code;
    const message=parsed?.error?.message||parsed?.message;
    if(message){
      return `${code?`${code}: `:""}${message}`.slice(0,240);
    }
  }catch{
    // Si Walmart devuelve HTML/texto, mostramos un fragmento seguro.
  }

  return text.replace(/\s+/g," ").trim().slice(0,240);
}

async function resolveWalmartReference():Promise<WalmartReference>{
  assertReferenceCoordinates();

  /*
   * VTEX documenta country + postalCode como forma directa de resolver
   * regiones. Río Segundo usa 20109, por lo que esta es nuestra primera
   * opción. Si Walmart cambia ese comportamiento, probamos geocoordenadas
   * como array (dos parámetros repetidos), que es el tipo definido por la
   * API de Checkout.
   */
  const attempts:Array<{label:string;params:URLSearchParams}>=[];

  const postalParams=new URLSearchParams({
    country:REFERENCE_COUNTRY,
    postalCode:REFERENCE_POSTAL_CODE
  });
  attempts.push({
    label:`código postal ${REFERENCE_POSTAL_CODE}`,
    params:postalParams
  });

  const geoArrayParams=new URLSearchParams({
    country:REFERENCE_COUNTRY
  });
  geoArrayParams.append(
    "geoCoordinates",
    String(REFERENCE_LONGITUDE)
  );
  geoArrayParams.append(
    "geoCoordinates",
    String(REFERENCE_LATITUDE)
  );
  attempts.push({
    label:"geocoordenadas",
    params:geoArrayParams
  });

  const failures:string[]=[];

  for(const attempt of attempts){
    const response=await fetch(
      `${WALMART_ORIGIN}/api/checkout/pub/regions?${attempt.params.toString()}`,
      {
        headers:{
          accept:"application/json",
          "user-agent":"Mozilla/5.0"
        },
        cache:"no-store"
      }
    );

    if(!response.ok){
      const detail=await readResponseDetail(response);
      failures.push(
        `${attempt.label}: HTTP ${response.status} (${detail})`
      );
      continue;
    }

    const data=await response.json() as unknown;
    const reference=parseReference(data);

    if(reference){
      return reference;
    }

    failures.push(
      `${attempt.label}: Walmart respondió correctamente, pero sin regionId`
    );
  }

  throw new Error(
    `Walmart no pudo resolver la tienda/zona de referencia. ${failures.join(" | ")}`
  );
}

function buildProductSearchUrl(
  reference:WalmartReference,
  page:number,
  count:number
){
  const params=new URLSearchParams({
    sc:SALES_CHANNEL,
    locale:"es-CR",
    regionId:reference.regionId,
    country:reference.country,
    simulationBehavior:"default",
    hideUnavailableItems:"true",
    count:String(count),
    page:String(page)
  });

  /*
   * Intelligent Search API v1 recibe la regionalización explícitamente
   * mediante regionId. No reenviamos coordinates aquí: ya resolvimos la
   * región con Checkout y evitamos que un formato de coordenadas distinto
   * bloquee la búsqueda de productos.
   */
  return(
    `${WALMART_ORIGIN}/api/intelligent-search/v1/`+
    `product-search/category-1/frutas-y-verduras?${params.toString()}`
  );
}

export async function fetchWalmartProducts():Promise<WalmartFetchResult>{
  const products:WalmartRawProduct[]=[];
  const pageSize=50;
  const reference=await resolveWalmartReference();

  for(let page=1;page<=20;page++){
    const url=buildProductSearchUrl(
      reference,
      page,
      pageSize
    );

    const response=await fetch(url,{
      headers:{
        accept:"application/json",
        "user-agent":"Mozilla/5.0"
      },
      cache:"no-store"
    });

    if(!response.ok){
      const detail=await response.text()
        .catch(()=>"");

      throw new Error(
        `Walmart respondió HTTP ${response.status}`+
        (detail?` (${detail.slice(0,180)})`:"")
      );
    }

    const data=await response.json() as ProductSearchResponse;

    const batch=
      Array.isArray(data?.products)
        ?data.products
        :[];

    if(page===1&&batch.length===0){
      throw new Error(
        `Walmart devolvió 0 productos para ${reference.label}. Se detuvo la actualización para evitar usar precios antiguos.`
      );
    }

    products.push(...batch);

    console.log(
      `Walmart ${reference.label} página ${page}: ${batch.length}`
    );

    if(batch.length<pageSize){
      break;
    }

    if(
      Number.isFinite(Number(data.recordsFiltered))&&
      products.length>=Number(data.recordsFiltered)
    ){
      break;
    }
  }

  if(products.length===0){
    throw new Error(
      `Walmart no devolvió productos para ${reference.label}. No se modificaron precios.`
    );
  }

  const uniqueProducts=[...new Map(
    products.map(product=>[String(product.productId),product])
  ).values()];

  return{
    products:uniqueProducts,
    reference
  };
}
