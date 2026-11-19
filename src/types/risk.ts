import type { Deal, DealSide } from './deal'

export interface RiskCalculationRequest {
  positions: Deal[]
  incomplete: boolean
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
  currency?: string | null
  price_currency?: string | null
  accrued_int_currency?: string | null
  price_fx_rate?: number | null
  accrued_int_fx_rate?: number | null
  price_fx_date?: string | null
  accrued_int_fx_date?: string | null
  price_fx_source?: string | null
  accrued_int_fx_source?: string | null
  duration_estimate?: MetricEstimate | null
  convexity_estimate?: MetricEstimate | null
}

export interface MetricEstimate {
  source: string
  model_version: string
  low?: number | null
  high?: number | null
  review_required: boolean
  limitations: string[] | null
}

export interface RiskCalculationResponse {
  id: string
  status: string
  as_of_date: string
  total_dv01_rub: number | null
  incomplete?: boolean
  positions: CalculationPositionResponse[]
}
