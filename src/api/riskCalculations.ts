import { apiRequest } from './client'
import { mockInstruments } from '../mocks/instruments'
import type { Deal } from '../types/deal'
import type { RiskCalculationRequest, RiskCalculationResponse } from '../types/risk'
import { createLocalId } from '../utils/ids'

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

export async function calculateRisk(deals: Deal[]): Promise<RiskCalculationResponse> {
  if (USE_MOCK_API) {
    const positions = deals.map((deal) => {
      const instrument = mockInstruments[deal.isin]
      const value = (instrument.price_clean ?? 0) + (instrument.accrued_int ?? 0)
      const marketValue = deal.quantity * value
      const dv01 =
        marketValue *
        (-(instrument.duration_mod ?? 0) * 0.0001 +
          0.5 * (instrument.convexity ?? 0) * 0.0001 * 0.0001) *
        (deal.side === 'buy' ? 1 : -1)
      return {
        id: createLocalId(),
        instrument_id: instrument.id,
        side: deal.side,
        quantity: deal.quantity,
        market_value: marketValue,
        duration_mod: instrument.duration_mod,
        dv01,
        source: 'mock',
        market_date: instrument.trade_date,
      }
    })
    return {
      id: createLocalId(),
      status: 'success',
      as_of_date: new Date().toISOString(),
      total_dv01_rub: positions.reduce((sum, position) => sum + position.dv01, 0),
      positions,
    }
  }

  const request: RiskCalculationRequest = {
    positions: deals,
  }

  return apiRequest<RiskCalculationResponse>('/risk-calculations', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
