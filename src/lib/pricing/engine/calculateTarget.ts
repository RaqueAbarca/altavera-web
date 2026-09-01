export function calculateTargetPrice(
  competitorPrice:number,
  discount:number
){
  if(competitorPrice <= 0){
    throw new Error("El precio del competidor debe ser mayor a 0")
  }

  if(discount < 0 || discount >= 1){
    throw new Error("El descuento debe estar entre 0 y 1")
  }

  return competitorPrice * (1 - discount)
}