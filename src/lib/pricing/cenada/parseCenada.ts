import { PDFParse } from "pdf-parse";

import type {
  CenadaBulletinType,
  CenadaRow,
  ParsedCenadaDocument
} from "./types";

function normalizeText(
  value:string
){
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}

function buildIsoDate(
  year:number,
  month:number,
  day:number
){
  const date=
    new Date(
      Date.UTC(
        year,
        month-1,
        day
      )
    );

  if(
    date.getUTCFullYear()!==year||
    date.getUTCMonth()!==month-1||
    date.getUTCDate()!==day
  ){
    return null;
  }

  return [
    year.toString().padStart(4,"0"),
    month.toString().padStart(2,"0"),
    day.toString().padStart(2,"0")
  ].join("-");
}

function detectDate(
  filename:string,
  text:string
){
  const combined=
    `${filename}\n${text}`;

  /*
   * Primero intentamos:
   *
   * 2026-08-25
   */
  const iso=
    combined.match(
      /\b(20\d{2})[-_/](\d{1,2})[-_/](\d{1,2})\b/
    );

  if(iso){
    const result=
      buildIsoDate(
        Number(iso[1]),
        Number(iso[2]),
        Number(iso[3])
      );

    if(result){
      return result;
    }
  }

  /*
   * Luego:
   *
   * 25/08/2026
   * 25-08-2026
   */
  const numeric=
    combined.match(
      /\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/
    );

  if(numeric){
    const result=
      buildIsoDate(
        Number(numeric[3]),
        Number(numeric[2]),
        Number(numeric[1])
      );

    if(result){
      return result;
    }
  }

  /*
   * Finalmente:
   *
   * 25 de agosto de 2026
   */
  const normalized=
    normalizeText(
      combined
    );

  const spanish=
    normalized.match(
      /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})\b/
    );

  if(spanish){
    const months:
      Record<string,number>={
        enero:1,
        febrero:2,
        marzo:3,
        abril:4,
        mayo:5,
        junio:6,
        julio:7,
        agosto:8,
        septiembre:9,
        setiembre:9,
        octubre:10,
        noviembre:11,
        diciembre:12
      };

    const result=
      buildIsoDate(
        Number(spanish[3]),
        months[spanish[2]],
        Number(spanish[1])
      );

    if(result){
      return result;
    }
  }

  throw new Error(
    `No se pudo determinar la fecha del boletín CENADA: ${filename}`
  );
}

function detectBulletinType(
  filename:string,
  text:string
):CenadaBulletinType{
  const normalized=
    normalizeText(
      `${filename}\n${text.slice(0,5000)}`
    );

  if(
    normalized.includes(
      "fruta importada"
    )
  ){
    return "fruta_importada";
  }

  if(
    normalized.includes(
      "aromatic"
    )&&
    normalized.includes(
      "gourmet"
    )
  ){
    return "aromaticos_gourmet";
  }

  if(
    normalized.includes(
      "pima-plaza"
    )||
    normalized.includes(
      "pima plaza"
    )||
    /\bplaza\b/.test(
      normalized
    )
  ){
    return "plaza";
  }

  throw new Error(
    `No se pudo identificar el tipo de boletín CENADA: ${filename}`
  );
}

export async function parseCenadaPdf(
  file:File
):Promise<ParsedCenadaDocument>{
  const buffer=
    await file.arrayBuffer();

  const parser=
    new PDFParse({
      data:buffer,
      verbosity:0
    });

  try{
    const result=
      await parser.getText();

    const text=
      result.text;

    console.log(
      "Texto CENADA recibido:",
      text.slice(0,2000)
    );

    const bulletinType=
      detectBulletinType(
        file.name,
        text
      );

    const bulletinDate=
      detectDate(
        file.name,
        text
      );

    const rows:CenadaRow[]=[];

    const lines=
      text
        .split("\n")
        .map(
          line=>
            line.trim()
        )
        .filter(Boolean);

    for(
      const line of lines
    ){
      /*
       * Ejemplo:
       *
       * Caja (10 kg) 15,000.00 20,000.00
       * 17,000.00 17,000.00 Aguacate Hass...
       */
      const match=
        line.match(
          /^(.*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(.*)$/
        );

      if(!match){
        continue;
      }

      const [
        ,
        unit,
        minimum,
        maximum,
        mode,
        average,
        productName
      ]=match;

      rows.push({
        source:"cenada",

        bulletinType,

        bulletinDate,

        plazaDate:
          bulletinDate,

        productName:
          productName.trim(),

        unit:
          unit.trim(),

        minimumPrice:
          Number(
            minimum.replace(
              /,/g,
              ""
            )
          ),

        maximumPrice:
          Number(
            maximum.replace(
              /,/g,
              ""
            )
          ),

        modePrice:
          Number(
            mode.replace(
              /,/g,
              ""
            )
          ),

        averagePrice:
          Number(
            average.replace(
              /,/g,
              ""
            )
          ),

        page:1,

        row:
          rows.length+1
      });
    }

    if(rows.length===0){
      throw new Error(
        `No se encontraron filas de precios en ${file.name}`
      );
    }

    console.log(
      "Boletín:",
      bulletinType,
      bulletinDate
    );

    console.log(
      "Filas encontradas:",
      rows.length
    );

    return{
      bulletinType,
      bulletinDate,
      rows
    };

  }finally{
    await parser.destroy();
  }
}