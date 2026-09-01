import { calculateMinimumPrice } from "./calculateMinimum"
import { calculateTargetPrice } from "./calculateTarget"
import { calculateRecommendation } from "./calculateRecommendation"
import { roundPrice } from "./roundPrice"
import { PricingInput, PricingResult } from "../types"

export function pricingEngine(
  input:PricingInput
):PricingResult & { finalPrice:number }{

  const {
    cenadaPrice,
    competitorPrice,
    rule
  } = input


  const minimumPrice = calculateMinimumPrice(
    cenadaPrice,
    rule.minimum_margin
  )


  const targetPrice = competitorPrice
    ? calculateTargetPrice(
        competitorPrice,
        rule.walmart_discount
      )
    : null


  const recommendation = calculateRecommendation(
    minimumPrice,
    targetPrice
  )


  const finalPrice = roundPrice(
    recommendation.recommendedPrice,
    rule.rounding
  )


  return {
    ...recommendation,
    recommendedPrice: finalPrice,
    finalPrice
  }
}