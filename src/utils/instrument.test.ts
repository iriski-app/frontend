import { describe, expect, it } from 'vitest'
import { mockInstruments } from '../mocks/instruments'
import { canCalculateInstrument, instrumentAmount, missingParameters } from './instrument'

const instrument = mockInstruments.RU000A100006

describe('готовность инструмента', () => {
  it('разрешает оценку ML при false в старом поле', () => {
    expect(
      canCalculateInstrument({
        ...instrument,
        ready_for_calculation: false,
        calculation_status: 'estimate_possible',
        duration_mod: null,
        missing_parameters: ['duration_mod', 'convexity'],
      }),
    ).toBe(true)
  })
  it.each(['price_clean', 'accrued_int', 'price_currency', 'fx_rate_CNY', 'market_data'])(
    'не обходит отсутствие %s',
    (field) => {
      expect(
        canCalculateInstrument({
          ...instrument,
          calculation_status: 'estimate_possible',
          missing_parameters: [field],
        }),
      ).toBe(false)
    },
  )
  it('учитывает unavailable даже при старом true', () => {
    expect(canCalculateInstrument({ ...instrument, calculation_status: 'unavailable' })).toBe(false)
  })
  it('поддерживает старый backend без статуса', () => {
    expect(canCalculateInstrument(instrument)).toBe(true)
    expect(canCalculateInstrument({ ...instrument, ready_for_calculation: false })).toBe(false)
  })
  it('переводит причины и не подменяет неизвестную валюту', () => {
    expect(
      missingParameters({ ...instrument, missing_parameters: ['fx_rate_CNY', 'price_currency'] }),
    ).toBe('курс CNY к рублю, валюта цены')
    expect(instrumentAmount(12, null)).toBe('12 (валюта не указана)')
  })
})
