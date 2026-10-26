import type { RiskCalculationResponse } from '../types/risk'

export const mockRiskCalculation: RiskCalculationResponse = {
  calculationId: '00000000-0000-4000-8000-000000000001',
  dv01: 205.4,
  dv01Rub: 205.4,
  dv01Low: null,
  dv01High: null,
  currency: 'RUB',
  dataSource: 'mock',
}
