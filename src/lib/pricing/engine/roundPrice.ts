export function roundPrice(
  price:number,
  rounding:string = "nearest_50"
){

  if(price <= 0){
    throw new Error("El precio debe ser mayor a 0")
  }

  switch(rounding){

    case "nearest_100":
      return Math.round(price / 100) * 100

    case "nearest_50":
      return Math.round(price / 50) * 50

    case "up_50":
      return Math.ceil(price / 50) * 50

    case "down_50":
      return Math.floor(price / 50) * 50

    default:
      return Math.round(price)
  }
}