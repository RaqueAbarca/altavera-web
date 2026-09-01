export interface PricingRule {
  minimum_margin:number
  walmart_discount:number
  maximum_margin?:number
  rounding:string
}

export interface PricingInput {
  currentPrice:number
  cenadaPrice:number
  competitorPrice?:number | null
  rule:PricingRule
}

export interface PricingResult {
  minimumPrice:number
  targetPrice:number|null
  recommendedPrice:number
  margin:number
}