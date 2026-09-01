import type { WalmartRawProduct } from "./types";

const URL_BASE=
  "https://www.walmart.co.cr/_v/segment/graphql/v1?workspace=master&maxAge=short&appsEtag=remove&domain=store&locale=es-CR&__bindingId=17dd0832-2127-4686-ad3a-09850b413565&operationName=productSearchV3";

const EXTENSION_BASE={
  persistedQuery:{
    version:1,
    sha256Hash:"b398fc0a2fd04ea5d4f7a94c732c10fb1bf64f8f9a2b31c92aee6a5e796457c9",
    sender:"vtex.store-resources@0.x",
    provider:"vtex.search-graphql@0.x"
  }
};

export async function fetchWalmartProducts(){
  const products:WalmartRawProduct[]=[];
  const batchSize=50;

  for(let from=0;from<1000;from+=batchSize){
    const variables={
      skusFilter:"ALL",
      simulationBehavior:"default",
      installmentCriteria:"MAX_WITHOUT_INTEREST",
      productOriginVtex:false,
      map:"category-1",
      query:"frutas-y-verduras",
      orderBy:"OrderByScoreDESC",
      from,
      to:from+batchSize-1,
      selectedFacets:[
        {
          key:"category-1",
          value:"frutas-y-verduras"
        }
      ],
      searchState:null,
      facetsBehavior:"Static",
      categoryTreeBehavior:"default",
      withFacets:false,
      variant:"6a679fb03056e27b8338e03c-variantNull"
    };

    const extension={
      ...EXTENSION_BASE,
      variables:Buffer.from(
        JSON.stringify(variables)
      ).toString("base64")
    };

    const url=
      `${URL_BASE}`+
      `&variables=%7B%7D`+
      `&extensions=${encodeURIComponent(
        JSON.stringify(extension)
      )}`;

    const response=await fetch(url,{
      headers:{
        accept:"*/*",
        "content-type":"application/json",
        "user-agent":"Mozilla/5.0"
      },
      cache:"no-store"
    });

    if(!response.ok){
      throw new Error(
        `Walmart respondió HTTP ${response.status}`
      );
    }

    const data=await response.json();

    const batch:WalmartRawProduct[]=
      data?.data?.productSearch?.products??[];

    products.push(...batch);

    console.log(
      `Walmart ${from}-${from+batchSize-1}: ${batch.length}`
    );

    if(batch.length<batchSize){
      break;
    }
  }

  return products;
}