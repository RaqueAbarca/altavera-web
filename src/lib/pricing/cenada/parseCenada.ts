import "pdf-parse/worker";
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


type CenadaPriceColumns={
  minimumPrice:number;
  maximumPrice:number;
  modePrice:number;
  averagePrice:number;
};

function isValidPriceColumns(
  prices:CenadaPriceColumns
){
  const {
    minimumPrice,
    maximumPrice,
    modePrice,
    averagePrice
  }=prices;

  if(
    ![
      minimumPrice,
      maximumPrice,
      modePrice,
      averagePrice
    ].every(Number.isFinite)
  ){
    return false;
  }

  const epsilon=0.01;

  return(
    minimumPrice<=maximumPrice+epsilon&&
    modePrice>=minimumPrice-epsilon&&
    modePrice<=maximumPrice+epsilon&&
    averagePrice>=minimumPrice-epsilon&&
    averagePrice<=maximumPrice+epsilon
  );
}

function resolvePriceColumns(
  raw:[number,number,number,number],
  line:string
):CenadaPriceColumns{
  const [a,b,c,d]=raw;

  /*
   * Dependiendo del orden interno del PDF, pdf-parse puede devolver
   * las columnas numéricas en el orden visual:
   *
   * mínimo, máximo, moda, promedio
   *
   * o en el orden inverso que hemos observado en los boletines PIMA:
   *
   * promedio, moda, máximo, mínimo
   *
   * No asumimos ninguno de los dos. Validamos ambas interpretaciones
   * usando propiedades que siempre deben cumplir los datos de CENADA:
   * mínimo <= máximo y tanto moda como promedio dentro de ese rango.
   */
  const visual:CenadaPriceColumns={
    minimumPrice:a,
    maximumPrice:b,
    modePrice:c,
    averagePrice:d
  };

  const reversed:CenadaPriceColumns={
    minimumPrice:d,
    maximumPrice:c,
    modePrice:b,
    averagePrice:a
  };

  const visualValid=
    isValidPriceColumns(visual);

  const reversedValid=
    isValidPriceColumns(reversed);

  if(visualValid&&!reversedValid){
    return visual;
  }

  if(reversedValid&&!visualValid){
    return reversed;
  }

  if(visualValid&&reversedValid){
    /*
     * Esto ocurre cuando los valores hacen equivalentes ambas
     * interpretaciones (por ejemplo, todos iguales).
     */
    return visual;
  }

  throw new Error(
    `No se pudo determinar el orden de las columnas de precio CENADA: ${line}`
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

      const unit=match[1];
      const productName=match[6];

      const rawPrices=
        [
          match[2],
          match[3],
          match[4],
          match[5]
        ].map(
          value=>
            Number(
              value.replace(
                /,/g,
                ""
              )
            )
        ) as [number,number,number,number];

      const prices=
        resolvePriceColumns(
          rawPrices,
          line
        );

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
          prices.minimumPrice,

        maximumPrice:
          prices.maximumPrice,

        modePrice:
          prices.modePrice,

        averagePrice:
          prices.averagePrice,

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