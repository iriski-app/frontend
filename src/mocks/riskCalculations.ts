import type { RiskCalculationResponse } from '../types/risk'

export const mockRiskCalculation: RiskCalculationResponse = {
  id: '00000000-0000-4000-8000-000000000001',
  status: 'success',
  as_of_date: '2026-10-20T00:00:00Z',
  total_dv01_rub: -2.046910125,
  incomplete: false,
  positions: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      instrument_id: '00000000-0000-4000-8000-000000000003',
      side: 'buy',
      quantity: 10,
      market_value: 9750,
      duration_mod: 2.1,
      dv01: -2.046910125,
      currency: 'RUB',
      price_currency: 'RUB',
      accrued_int_currency: 'RUB',
      price_fx_rate: 1,
      accrued_int_fx_rate: 1,
      price_fx_date: null,
      accrued_int_fx_date: null,
      price_fx_source: null,
      accrued_int_fx_source: null,
      source: 'mock',
      market_date: '2026-10-20T00:00:00Z',
    },
  ],
}
