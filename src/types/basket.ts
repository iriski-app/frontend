import type { Deal } from './deal'
import type { InstrumentDetails } from './instrument'
import type { CalculationPositionResponse } from './risk'

export interface BasketItem {
  id: string
  deal: Deal
  instrument: InstrumentDetails
  positionResult: CalculationPositionResponse | null
}

export interface BasketTotal {
  value: number
  calculationId: string
  asOfDate: string
  calculatedAt: string
  included: number
  total: number
}

export interface BasketState {
  items: BasketItem[]
  total: BasketTotal | null
}
