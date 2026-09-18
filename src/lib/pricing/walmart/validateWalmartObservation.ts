import type { WalmartProduct } from "./types";

export type WalmartValidationStatus=
  |"valid"
  |"suspicious_price"
  |"presentation_changed"
  |"no_price";

type PreviousObservation={
  current_price:number|null;
  raw_price:number|null;
  last_valid_current_price:number|null;
  measurement_unit:string|null;
  quantity_text:string|null;
  unit_multiplier:number|null;
};

export type WalmartObservationValidation={
  status:WalmartValidationStatus;
  warning:string|null;
  previousPrice:number|null;
  priceChangePercent:number|null;
  presentationChanged:boolean;
  presentationSignature:string;
};

const DEFAULT_MAX_PRICE_CHANGE_PERCENT=40;

function normalizedText(value:string|null|undefined){
  return (value??"")
    .trim()
    .toLowerCase()
    .replace(/\s+/g," ")
    .replace(/\s*([.,;/()-])\s*/g,"$1");
}

function normalizedNumber(value:number|null|undefined){
  if(value===null||value===undefined||!Number.isFinite(Number(value))){
    return "";
  }

  return String(Number(value));
}

export function buildPresentationSignature(input:{
  measurementUnit:string|null|undefined;
  quantityText:string|null|undefined;
  unitMultiplier:number|null|undefined;
}){
  return [
    normalizedText(input.measurementUnit),
    normalizedText(input.quantityText),
    normalizedNumber(input.unitMultiplier)
  ].join("|");
}

function getMaxPriceChangePercent(){
  const configured=Number(
    process.env.WALMART_MAX_PRICE_CHANGE_PERCENT??
    DEFAULT_MAX_PRICE_CHANGE_PERCENT
  );

  return Number.isFinite(configured)&&configured>0
    ?configured
    :DEFAULT_MAX_PRICE_CHANGE_PERCENT;
}

export function validateWalmartObservation(
  product:WalmartProduct,
  previous:PreviousObservation|null
):WalmartObservationValidation{
  const presentationSignature=
    buildPresentationSignature({
      measurementUnit:product.measurementUnit,
      quantityText:product.quantityText,
      unitMultiplier:product.unitMultiplier
    });

  const previousPrice=
    previous
      ?Number(
          previous.last_valid_current_price??
          previous.current_price??
          previous.raw_price??
          0
        )||null
      :null;

  const previousSignature=
    previous
      ?buildPresentationSignature({
          measurementUnit:previous.measurement_unit,
          quantityText:previous.quantity_text,
          unitMultiplier:previous.unit_multiplier
        })
      :null;

  const presentationChanged=
    previousSignature!==null&&
    previousSignature!==presentationSignature;

  const currentPrice=
    product.currentPrice;

  if(currentPrice===null||!Number.isFinite(currentPrice)||currentPrice<=0){
    return{
      status:"no_price",
      warning:"Walmart no informó un precio actual utilizable para este producto.",
      previousPrice,
      priceChangePercent:null,
      presentationChanged,
      presentationSignature
    };
  }

  if(presentationChanged){
    return{
      status:"presentation_changed",
      warning:"Walmart cambió la unidad o presentación. La conversión debe volver a verificarse antes de usar este precio.",
      previousPrice,
      priceChangePercent:
        previousPrice!==null&&previousPrice>0
          ?Math.round(((currentPrice-previousPrice)/previousPrice)*10000)/100
          :null,
      presentationChanged:true,
      presentationSignature
    };
  }

  const priceChangePercent=
    previousPrice!==null&&previousPrice>0
      ?Math.round(((currentPrice-previousPrice)/previousPrice)*10000)/100
      :null;

  if(
    priceChangePercent!==null&&
    Math.abs(priceChangePercent)>getMaxPriceChangePercent()
  ){
    return{
      status:"suspicious_price",
      warning:
        `El precio cambió ${Math.abs(priceChangePercent).toLocaleString("es-CR")}% respecto a la observación anterior. Requiere revisión manual.`,
      previousPrice,
      priceChangePercent,
      presentationChanged:false,
      presentationSignature
    };
  }

  return{
    status:"valid",
    warning:null,
    previousPrice,
    priceChangePercent,
    presentationChanged:false,
    presentationSignature
  };
}
