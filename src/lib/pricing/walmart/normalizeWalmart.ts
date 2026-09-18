import type {
  WalmartProduct,
  WalmartRawProduct,
  WalmartReference
} from "./types";

function extractQuantity(productName:string):string|null{
  const quantityMatch=productName.match(
    /\d+(?:[.,]\d+)?\s*(?:kg|kilos?|kilogramos?|g|gr|gramos?|ml|l|litros?|unidad(?:es)?|und|uds)\b/i
  );

  if(quantityMatch){
    return quantityMatch[0];
  }

  const packMatch=productName.match(/\d+\s*pack\b/i);

  if(packMatch){
    return packMatch[0];
  }

  if(/\bkilo\b/i.test(productName)){
    return "1 kg";
  }

  return null;
}

function positiveNumber(value:unknown):number|null{
  if(value===null||value===undefined){
    return null;
  }

  const number=Number(value);

  return Number.isFinite(number)&&number>0
    ?number
    :null;
}

function roundPercent(value:number){
  return Math.round(value*100)/100;
}

export function normalizeWalmartProduct(
  product:WalmartRawProduct,
  reference?:WalmartReference
):WalmartProduct{
  const items=product.items??[];
  const referenceSellerIds=new Set(
    (reference?.sellers??[]).map(seller=>seller.id)
  );

  const sellerCandidates=items.flatMap(item=>{
    const sellers=item.sellers??[];
    const eligible=
      referenceSellerIds.size>0
        ?sellers.filter(seller=>
            seller.sellerId&&
            referenceSellerIds.has(String(seller.sellerId))
          )
        :sellers;

    return eligible.map(seller=>({item,seller}));
  });

  const pricedCandidates=sellerCandidates
    .filter(({seller})=>
      positiveNumber(seller.commertialOffer?.Price)!==null
    )
    .sort((a,b)=>
      Number(a.seller.commertialOffer?.Price??Infinity)-
      Number(b.seller.commertialOffer?.Price??Infinity)
    );

  const selected=
    pricedCandidates.find(({seller})=>
      Number(seller.commertialOffer?.AvailableQuantity??1)>0
    )??pricedCandidates[0]??null;

  const selectedItem=selected?.item??(items.length===1?items[0]:undefined);
  const selectedSeller=selected?.seller??null;
  const offer=selectedSeller?.commertialOffer;

  /*
   * El priceRange de búsqueda ya viene regionalizado por regionId.
   * Solo lo usamos como respaldo cuando el producto tiene una única
   * presentación; con varias SKU sería ambiguo asignar ese precio a
   * una presentación concreta.
   */
  const allowPriceRangeFallback=items.length<=1;

  const currentPrice=
    positiveNumber(offer?.Price)??
    (allowPriceRangeFallback
      ?positiveNumber(product.priceRange?.sellingPrice?.lowPrice)
      :null);

  const rawListPrice=
    positiveNumber(offer?.ListPrice)??
    (allowPriceRangeFallback
      ?positiveNumber(product.priceRange?.listPrice?.lowPrice)
      :null);
  const regularPrice=rawListPrice??currentPrice;

  const discountPercent=
    currentPrice!==null&&
    regularPrice!==null&&
    regularPrice>currentPrice
      ?roundPercent(((regularPrice-currentPrice)/regularPrice)*100)
      :0;

  return{
    externalId:String(product.productId),
    name:product.productName.trim(),
    price:currentPrice,
    currentPrice,
    regularPrice,
    discountPercent,
    measurementUnit:selectedItem?.measurementUnit??null,
    quantityText:extractQuantity(product.productName),
    unitMultiplier:
      selectedItem?.unitMultiplier!==undefined
        ?Number(selectedItem.unitMultiplier)
        :null,
    selectedSellerId:selectedSeller?.sellerId
      ?String(selectedSeller.sellerId)
      :null,
    selectedSellerName:selectedSeller?.sellerName?.trim()||null,
    rawData:product
  };
}
