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
 * Usamos la ubicación de Walmart Alajuela (Río Segundo / Las Cañas)
 * para que VTEX resuelva la región comercial correspondiente a esa
 * zona. Las variables de entorno permiten cambiar la referencia en
 * el futuro sin tocar código.
 */
const REFERENCE_LABEL=
  process.env.WALMART_REFERENCE_LABEL?.trim()||
  "Walmart Alajuela — Río Segundo (Las Cañas)";

const REFERENCE_COUNTRY=
  process.env.WALMART_REFERENCE_COUNTRY?.trim()||
  "CRI";

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

async function resolveWalmartReference():Promise<WalmartReference>{
  assertReferenceCoordinates();

  const params=new URLSearchParams({
    country:REFERENCE_COUNTRY,
    geoCoordinates:
      `${REFERENCE_LONGITUDE},${REFERENCE_LATITUDE}`
  });

  const response=await fetch(
    `${WALMART_ORIGIN}/api/checkout/pub/regions?${params.toString()}`,
    {
      headers:{
        accept:"application/json",
        "user-agent":"Mozilla/5.0"
      },
      cache:"no-store"
    }
  );

  if(!response.ok){
    throw new Error(
      `Walmart no pudo resolver la tienda/zona de referencia (HTTP ${response.status}).`
    );
  }

  const data=await response.json() as RegionResponse[];

  const regions=Array.isArray(data)
    ?data.filter(region=>
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
    throw new Error(
      "Walmart no devolvió una región para la referencia de Alajuela. Se detuvo la actualización."
    );
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
    coordinates:
      `${reference.longitude},${reference.latitude}`,
    simulationBehavior:"default",
    hideUnavailableItems:"true",
    count:String(count),
    page:String(page)
  });

  /*
   * Intelligent Search API v1 (julio 2026).
   * Evitamos el antiguo persistedQuery de GraphQL, cuyo hash podía
   * cambiar sin aviso y dejar la integración devolviendo 0 productos.
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

  /*
   * Las páginas de búsqueda pueden solaparse si el catálogo cambia
   * durante la consulta. Eliminamos duplicados antes de guardar para
   * que un mismo producto nunca llegue dos veces al mismo upsert.
   */
  const uniqueProducts=[...new Map(
    products.map(product=>[String(product.productId),product])
  ).values()];

  return{
    products:uniqueProducts,
    reference
  };
}
