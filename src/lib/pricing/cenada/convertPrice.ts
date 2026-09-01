export function convertCenadaPrice(
  price:number,
  unit:string
){

  const normalized = unit.toLowerCase();

  // Producto vendido por kilogramo

  if(normalized === "java"){

    return {
      unit:"kg",
      factor:22,
      price:Math.round(price/22)
    };
  }

    if(normalized === "caja plástica"){

    return {
      unit:"Und",
      factor:18,
      price:Math.round(price/18)
    };
  }

  if(normalized === "kilo"){

    return {
      unit:"kg",
      factor:1,
      price
    };

  }

    if(normalized.includes("18 kg")){

    return {
      unit:"kg",
      factor:18,
      price:Math.round(price/18)
    };

  }

  if(normalized.includes("10 kg")){

    return {
      unit:"kg",
      factor:10,
      price:Math.round(price/10)
    };

  }

  if(normalized.includes("8.2 kg")){

    return {
      unit:"kg",
      factor:8.2,
      price:Math.round(price/8.2)
    };

  }

  // Caja (80-100 und)
  const match = normalized.match(/(\d+)\s*-\s*(\d+)\s*und/);

  if(match){

    const min = Number(match[1]);
    const max = Number(match[2]);

    const promedio = (min + max) / 2;

    return{

      unit:"unidad",

      factor:promedio,

      price:Math.round(price/promedio)

    };

  }

  // Todo lo demás permanece igual
  return{

    unit,

    factor:1,

    price

  };

}