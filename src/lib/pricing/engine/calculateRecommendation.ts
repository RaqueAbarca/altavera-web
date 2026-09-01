import { PricingResult } from "../types"

export function calculateRecommendation(
  minimumPrice:number,
  targetPrice:number|null
):PricingResult{

  let recommendedPrice = minimumPrice

  if(targetPrice !== null && targetPrice >= minimumPrice){
    recommendedPrice = (minimumPrice + targetPrice) / 2
  }

  const margin = 0

  return {
    minimumPrice,
    targetPrice,
    recommendedPrice,
    margin
  }
}