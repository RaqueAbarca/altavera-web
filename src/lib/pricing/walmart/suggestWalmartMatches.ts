type AltaveraProduct={
  id:number;
  name:string;
  unit:string|null;
};

type WalmartProduct={
  id:number;
  name:string;
  measurement_unit:string|null;
  quantity_text:string|null;
};

export type WalmartSuggestion={
  productId:number;
  name:string;
  unit:string|null;
  score:number;
};

const STOP_WORDS=new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "en",
  "con",
  "sin",
  "para",
  "aproximadamente",
  "hortifruti",
  "walmart",
  "empacado",
  "empacada",
  "bolsa",
  "malla",
  "bandeja",
  "pack",
  "unidad",
  "unidades",
  "uds",
  "und",
  "kilo",
  "kilos",
  "kg",
  "gramos",
  "gramo",
  "gr"
]);

const SYNONYMS:Record<string,string>={
  elote:"maiz",
  maiz:"maiz",
  aguacates:"aguacate",
  tomates:"tomate",
  papas:"papa",
  cebollas:"cebolla",
  zanahorias:"zanahoria",
  bananos:"banano",
  platanos:"platano",
  limones:"limon",
  naranjas:"naranja",
  uvas:"uva",
  ajos:"ajo",
  lechugas:"lechuga",
  hongos:"hongo",
  chiles:"chile",
  mangos:"mango",
  manga:"mango",
  pinas:"pina",
  sandias:"sandia"
};

function removeAccents(value:string){
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"");
}

function normalize(value:string|null){
  return removeAccents(
    value?.trim().toLowerCase()??""
  );
}

function normalizeWord(word:string){
  const normalized=
    normalize(word);

  return SYNONYMS[normalized]??
    normalized;
}

function tokenize(value:string){
  return normalize(value)
    .replace(/[^a-z0-9]+/g," ")
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean)
    .filter(
      word=>
        !STOP_WORDS.has(word)
    )
    .filter(
      word=>
        !/^\d+$/.test(word)
    );
}

function parseWeightKg(
  value:string|null
){
  const text=
    normalize(value);

  const match=
    text.match(
      /(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos|g|gr|gramo|gramos)\b/
    );

  if(!match){
    return null;
  }

  const amount=
    Number(
      match[1].replace(",",".")
    );

  if(
    !Number.isFinite(amount)||
    amount<=0
  ){
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

function parseCount(
  value:string|null
){
  const text=
    normalize(value);

  const match=
    text.match(
      /(\d+)\s*(unidad|unidades|und|uds)\b/
    );

  if(!match){
    return null;
  }

  const count=
    Number(match[1]);

  return Number.isInteger(count)&&count>0
    ?count
    :null;
}

function calculateNameScore(
  walmartName:string,
  altaveraName:string
){
  const walmartTokens=
    tokenize(walmartName);

  const altaveraTokens=
    tokenize(altaveraName);

  if(
    walmartTokens.length===0||
    altaveraTokens.length===0
  ){
    return 0;
  }

  const walmartSet=
    new Set(walmartTokens);

  const altaveraSet=
    new Set(altaveraTokens);

  let shared=0;

  for(const token of altaveraSet){
    if(walmartSet.has(token)){
      shared++;
    }
  }

  const altaveraCoverage=
    shared/altaveraSet.size;

  const walmartCoverage=
    shared/walmartSet.size;

  let score=
    (
      altaveraCoverage*0.75+
      walmartCoverage*0.25
    )*100;

  const cleanWalmart=
    normalize(walmartName);

  const cleanAltavera=
    normalize(altaveraName);

  if(
    cleanWalmart.includes(
      cleanAltavera
    )
  ){
    score+=12;
  }

  return Math.min(
    100,
    score
  );
}

function calculateUnitScore(
  walmart:WalmartProduct,
  altavera:AltaveraProduct
){
  const walmartMeasurement=
    normalize(
      walmart.measurement_unit
    );

  const altaveraUnit=
    normalize(
      altavera.unit
    );

  /*
   * Kg Walmart → Kg Altavera
   */
  if(
    walmartMeasurement==="kg"&&
    (
      altaveraUnit==="kg"||
      altaveraUnit==="kilo"
    )
  ){
    return 100;
  }

  const walmartWeight=
    parseWeightKg(
      walmart.quantity_text
    );

  const altaveraWeight=
    parseWeightKg(
      altavera.unit
    );

  /*
   * Ambos tienen peso explícito.
   * Ej. Walmart 500 g
   * vs Altavera Bandeja 500 g.
   */
  if(
    walmartWeight&&
    altaveraWeight
  ){
    const ratio=
      Math.min(
        walmartWeight,
        altaveraWeight
      )/
      Math.max(
        walmartWeight,
        altaveraWeight
      );

    if(ratio>=0.95){
      return 100;
    }

    /*
     * Pesos diferentes siguen siendo
     * convertibles, pero no idénticos.
     */
    if(ratio>=0.5){
      return 70;
    }

    return 45;
  }

  const walmartCount=
    parseCount(
      walmart.quantity_text
    );

  /*
   * Walmart trae una cantidad explícita
   * y Altavera vende por unidad.
   */
  if(
    walmartCount&&
    altaveraUnit==="und"
  ){
    return walmartCount===1
      ?100
      :65;
  }

  /*
   * Walmart dice explícitamente Unidad.
   */
  if(
    walmartMeasurement==="un"&&
    altaveraUnit==="und"&&
    /\bunidad\b/i.test(
      walmart.name
    )
  ){
    return 100;
  }

  /*
   * Walmart por unidad y Altavera
   * presentación no identificable.
   * No asumimos equivalencia.
   */
  if(
    walmartMeasurement==="un"
  ){
    return 45;
  }

  /*
   * Evidencia insuficiente.
   */
  return 50;
}

function calculateScore(
  walmart:WalmartProduct,
  altavera:AltaveraProduct
){
  const nameScore=
    calculateNameScore(
      walmart.name,
      altavera.name
    );

  const unitScore=
    calculateUnitScore(
      walmart,
      altavera
    );

  /*
   * El nombre sigue siendo el criterio
   * principal, pero unidad/presentación
   * pesa un 20%.
   */
  return Math.round(
    nameScore*0.80+
    unitScore*0.20
  );
}

export function suggestWalmartMatches(
  walmartProduct:WalmartProduct,
  products:AltaveraProduct[],
  limit=3
):WalmartSuggestion[]{
  return products
    .map(product=>({
      productId:product.id,
      name:product.name,
      unit:product.unit,
      score:calculateScore(
        walmartProduct,
        product
      )
    }))
    .filter(
      suggestion=>
        suggestion.score>=30
    )
    .sort(
      (a,b)=>
        b.score-a.score
    )
    .slice(0,limit);
}