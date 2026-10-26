import type { InstrumentDetails } from '../types/instrument'
import { mockInstruments } from '../mocks/instruments'

export async function getInstrumentDetails(isin: string): Promise<InstrumentDetails | null> {
  const normalizedIsin = isin.trim().toUpperCase()

  return mockInstruments[normalizedIsin] ?? null
}
