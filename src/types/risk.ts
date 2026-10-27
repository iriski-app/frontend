import type { Deal, DealSide } from './deal'

export interface RiskCalculationRequest {
  positions: Deal[]
}

export interface CalculationPositionResponse {
  id: string
  instrument_id: string
  side: DealSide
  quantity: number
  market_value: number | null
  duration_mod: number | null
  dv01: number | null
  source: string
  market_date: string | null
}

export interface RiskCalculationResponse {
  id: string
  status: string
  as_of_date: string
  total_dv01_rub: number | null
  positions: CalculationPositionResponse[]
}
