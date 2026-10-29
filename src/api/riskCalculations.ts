import { apiRequest } from './client'
import { mockRiskCalculation } from '../mocks/riskCalculations'
import type { Deal } from '../types/deal'
import type { RiskCalculationRequest, RiskCalculationResponse } from '../types/risk'

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

export async function calculateRisk(deal: Deal): Promise<RiskCalculationResponse> {
  if (USE_MOCK_API) {
    return mockRiskCalculation
  }

  const request: RiskCalculationRequest = {
    positions: [deal],
  }

  return apiRequest<RiskCalculationResponse>('/risk-calculations', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
