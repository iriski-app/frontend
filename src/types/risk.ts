import type { Deal } from './deal'

export type RiskCalculationRequest = Deal

export interface RiskCalculationResponse {
  calculationId: string
  dv01: number | null
  dv01Rub: number | null
  dv01Low: number | null
  dv01High: number | null
  currency: string
  dataSource: string | null
}
