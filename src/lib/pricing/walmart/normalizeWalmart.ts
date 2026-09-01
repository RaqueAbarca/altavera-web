import type {
  WalmartProduct,
  WalmartRawProduct
} from "./types";

function extractQuantity(
  productName:string
):string|null{
  const quantityMatch=productName.match(
    /\d+(?:[.,]\d+)?\s*(?:kg|kilos?|kilogramos?|g|gr|gramos?|ml|l|litros?|unidad(?:es)?|und|uds)\b/i
  );

  if(quantityMatch){
    return quantityMatch[0];
  }

  const packMatch=productName.match(
    /\d+\s*pack\b/i
  );

  if(packMatch){
    return packMatch[0];
  }

  if(/\bkilo\b/i.test(productName)){
    return "1 kg";
  }

  return null;
}

export function normalizeWalmartProduct(
  product:WalmartRawProduct
):WalmartProduct{
  const item=product.items?.[0];

  const offer=
    item?.sellers?.[0]?.commertialOffer;

  const rawPrice=
    offer?.Price??
    product.priceRange?.sellingPrice?.lowPrice??
    null;

  const numericPrice=
    rawPrice!==null
      ?Number(rawPrice)
      :null;

  return{
    externalId:String(product.productId),

    name:product.productName.trim(),

    price:
      numericPrice!==null&&
      Number.isFinite(numericPrice)&&
      numericPrice>0
        ?numericPrice
        :null,

    measurementUnit:
      item?.measurementUnit??null,

    quantityText:
      extractQuantity(product.productName),

    unitMultiplier:
      item?.unitMultiplier!==undefined
        ?Number(item.unitMultiplier)
        :null,

    rawData:product
  };
}