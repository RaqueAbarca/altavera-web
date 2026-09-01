import {
  suggestWalmartMatches
} from "./suggestWalmartMatches";

type AltaveraProduct={
  id:number;
  name:string;
  unit:string|null;
};

type WalmartProduct={
  id:number;
  name:string;
  raw_price:number|null;
  measurement_unit:string|null;
  quantity_text:string|null;
};

export type WalmartCandidate={
  competitorProductId:number;
  name:string;
  rawPrice:number|null;
  measurementUnit:string|null;
  quantityText:string|null;
  score:number;
};

export function suggestWalmartCandidatesForProduct(
  product:AltaveraProduct,
  walmartProducts:WalmartProduct[],
  limit=5
):WalmartCandidate[]{
  const candidates:WalmartCandidate[]=[];

  for(const walmart of walmartProducts){
    const suggestions=
      suggestWalmartMatches(
        {
          id:walmart.id,
          name:walmart.name,
          measurement_unit:
            walmart.measurement_unit,
          quantity_text:
            walmart.quantity_text
        },
        [product],
        1
      );

    const suggestion=
      suggestions[0];

    if(!suggestion){
      continue;
    }

    candidates.push({
      competitorProductId:
        walmart.id,

      name:
        walmart.name,

      rawPrice:
        walmart.raw_price,

      measurementUnit:
        walmart.measurement_unit,

      quantityText:
        walmart.quantity_text,

      score:
        suggestion.score
    });
  }

  return candidates
    .sort(
      (a,b)=>
        b.score-a.score
    )
    .slice(0,limit);
}