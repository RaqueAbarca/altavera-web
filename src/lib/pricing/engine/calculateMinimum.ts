export function calculateMinimumPrice(
  cost:number,
  minimumMargin:number
){
  if(cost <= 0){
    throw new Error("El costo debe ser mayor a 0")
  }

  if(minimumMargin < 0 || minimumMargin >= 1){
    throw new Error("El margen debe estar entre 0 y 1")
  }

  return cost / (1 - minimumMargin)
}