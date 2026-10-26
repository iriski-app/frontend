import { apiRequest } from './client'
import { mockRiskCalculation } from '../mocks/riskCalculations'
import type { RiskCalculationRequest, RiskCalculationResponse } from '../types/risk'

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

export async function calculateRisk(
  deal: RiskCalculationRequest,
): Promise<RiskCalculationResponse> {
  if (USE_MOCK_API) {
    return mockRiskCalculation
  }

  return apiRequest<RiskCalculationResponse>('/risk-calculations', {
    method: 'POST',
    body: JSON.stringify(deal),
  })
}
