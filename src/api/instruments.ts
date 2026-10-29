import { ApiError, apiRequest } from './client'
import { mockInstruments } from '../mocks/instruments'
import type { InstrumentDetails } from '../types/instrument'

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

export async function getInstrumentDetails(isin: string): Promise<InstrumentDetails | null> {
  const normalizedIsin = isin.trim().toUpperCase()

  if (USE_MOCK_API) {
    return mockInstruments[normalizedIsin] ?? null
  }

  try {
    return await apiRequest<InstrumentDetails>(`/instruments/${encodeURIComponent(normalizedIsin)}`)
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      error.code === 'instrument_not_found'
    ) {
      return null
    }

    throw error
  }
}
