import type { InstrumentDetails } from '../types/instrument'

export const mockInstruments: Record<string, InstrumentDetails> = {
  RU000A100006: {
    instrument: {
      isin: 'RU000A100006',
      name: 'Демонстрационная облигация',
      instrumentType: 'bond',
      issuerName: 'Тестовый эмитент',
      currency: 'RUB',
      faceValue: 1000,
      couponType: 'fixed',
      couponFreq: 2,
      couponRate: 8.5,
      maturityDate: '2028-12-15',
    },
    marketData: {
      priceType: 'clean',
      priceClean: 97.5,
      accruedInt: 12.4,
      durationMod: 2.1,
      convexity: null,
      ytm: null,
      source: 'mock',
      tradeDate: '2026-10-20',
      loadedAt: '2026-10-20T12:00:00Z',
    },
  },
}
