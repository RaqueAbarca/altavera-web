type Input={
  walmartName:string;
  measurementUnit:string|null;
  quantityText:string|null;
  altaveraUnit:string|null;
};

type Result={
  factor:number;
  reason:string;
}|null;

function normalize(value:string|null){
  return value
    ?.trim()
    .toLowerCase()
    .replace(",",".")??"";
}

function parseWeightKg(value:string){
  const text=normalize(value);

  const match=text.match(
    /(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|g|gr|gramo|gramos)\b/
  );

  if(!match){
    return null;
  }

  const amount=Number(match[1]);

  if(!Number.isFinite(amount)||amount<=0){
    return null;
  }

  const unit=match[2];

  if(
    unit==="kg"||
    unit==="kilo"||
    unit==="kilos"
  ){
    return amount;
  }

  return amount/1000;
}

function parseCount(value:string){
  const text=normalize(value);

  const match=text.match(
    /(\d+)\s*(unidad|unidades|und|uds)\b/
  );

  if(!match){
    return null;
  }

  const count=Number(match[1]);

  return Number.isInteger(count)&&count>0
    ?count
    :null;
}

function targetWeightKg(
  altaveraUnit:string
){
  const normalized=
    normalize(altaveraUnit);

  if(
    normalized==="kg"||
    normalized==="kilo"
  ){
    return 1;
  }

  return parseWeightKg(
    altaveraUnit
  );
}

export function calculateWalmartConversion(
  input:Input
):Result{
  const measurementUnit=
    normalize(input.measurementUnit);

  const altaveraUnit=
    normalize(input.altaveraUnit);

  const targetWeight=
    targetWeightKg(
      input.altaveraUnit??""
    );

  /*
   * Walmart vende por kg.
   * Price ya representa precio/kg.
   *
   * unitMultiplier puede ser 0.25,
   * pero eso es incremento de compra,
   * NO el precio base.
   */
  if(
    measurementUnit==="kg"&&
    targetWeight
  ){
    const factor=
      1/targetWeight;

    return{
      factor,
      reason:
        targetWeight===1
          ?"Walmart expresa el precio por kilogramo y Altavera vende por kilogramo."
          :`Walmart expresa precio por kg. Una unidad Altavera equivale a ${targetWeight} kg.`
    };
  }

  /*
   * Walmart vende una presentación
   * de peso explícito.
   *
   * Ej:
   * Walmart 200 g
   * Altavera 500 g
   *
   * factor = 0.2 / 0.5 = 0.4
   */
  const sourceWeight=
    input.quantityText
      ?parseWeightKg(
          input.quantityText
        )
      :null;

  if(
    measurementUnit==="un"&&
    sourceWeight&&
    targetWeight
  ){
    return{
      factor:
        sourceWeight/
        targetWeight,

      reason:
        `Presentación Walmart ${sourceWeight} kg vs unidad Altavera ${targetWeight} kg.`
    };
  }

  /*
   * Paquete explícito de N unidades
   * contra Altavera por unidad.
   *
   * Walmart: 3 Uds
   * Altavera: Und
   * factor = 3
   */
  const sourceCount=
    input.quantityText
      ?parseCount(
          input.quantityText
        )
      :null;

  if(
    measurementUnit==="un"&&
    altaveraUnit==="und"&&
    sourceCount
  ){
    return{
      factor:sourceCount,
      reason:
        `Walmart vende ${sourceCount} unidades por presentación y Altavera vende por unidad.`
    };
  }

  /*
   * Producto explícitamente vendido
   * como una unidad.
   *
   * Somos estrictos:
   * debe aparecer "Unidad" en el nombre.
   */
  if(
    measurementUnit==="un"&&
    altaveraUnit==="und"&&
    !input.quantityText&&
    /\bunidad\b/i.test(
      input.walmartName
    )
  ){
    return{
      factor:1,
      reason:
        "Walmart y Altavera venden una unidad individual."
    };
  }

  return null;
}