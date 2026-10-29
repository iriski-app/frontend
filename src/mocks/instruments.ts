import type { InstrumentDetails } from '../types/instrument'

export const mockInstruments: Record<string, InstrumentDetails> = {
  RU000A100006: {
    isin: 'RU000A100006',
    name: 'Демонстрационная облигация',
    instrument_type: 'bond',
    issuer_name: 'Тестовый эмитент',
    currency: 'RUB',
    face_value: 1000,

    coupon_type: 'fixed',
    coupon_freq: 2,
    coupon_rate: 8.5,
    maturity_date: '2028-12-15',

    price_type: 'clean',
    price_clean: 1000,
    accrued_int: 15.5,
    duration_mod: 3.5,
    convexity: 12.1,
    ytm: 9.2,
    source: 'mock',
    trade_date: '2026-10-20',
    loaded_at: '2026-10-20T12:00:00Z',

    ready_for_calculation: true,
    missing_parameters: [],
  },
}
