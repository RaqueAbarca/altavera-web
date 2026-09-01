export type CenadaBulletinType=
  |"plaza"
  |"fruta_importada"
  |"aromaticos_gourmet";

export interface CenadaRow{
  source:"cenada";

  bulletinType:CenadaBulletinType;

  bulletinDate:string;

  plazaDate:string;

  productName:string;

  unit:string;

  minimumPrice:number;

  maximumPrice:number;

  modePrice:number;

  averagePrice:number;

  page:number;

  row:number;
}

export interface ParsedCenadaDocument{
  bulletinType:CenadaBulletinType;

  bulletinDate:string;

  rows:CenadaRow[];
}

export interface ParsedProduct{
  bulletin:CenadaRow;

  normalizedName:string;

  productId?:number;

  productName?:string;

  matched:boolean;

  ignored?:boolean;

  priority?:number;

  matchMethod:
    |"mapping"
    |"alias"
    |"exact"
    |"normalized"
    |"ignored"
    |"unmatched";
}