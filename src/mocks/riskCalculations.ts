import type { RiskCalculationResponse } from '../types/risk'

export const mockRiskCalculation: RiskCalculationResponse = {
  id: '00000000-0000-4000-8000-000000000001',
  status: 'completed',
  as_of_date: '2026-10-27T00:00:00Z',
  total_dv01_rub: 205.4,
  positions: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      instrument_id: '00000000-0000-4000-8000-000000000003',
      side: 'buy',
      quantity: 10,
      market_value: 9750,
      duration_mod: 2.1,
      dv01: 205.4,
      source: 'mock',
      market_date: '2026-10-20T00:00:00Z',
    },
  ],
}
