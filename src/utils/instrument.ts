import type { InstrumentDetails } from '../types/instrument'

const parameterNames: Record<string, string> = {
  price_clean: 'чистая цена',
  accrued_int: 'накопленный купонный доход',
  duration_mod: 'модифицированная дюрация',
  convexity: 'выпуклость',
  price_currency: 'валюта цены',
  accrued_int_currency: 'валюта НКД',
  currency: 'валюта инструмента',
  market_data: 'рыночные данные',
  market_date: 'дата рыночных данных',
  face_value: 'номинал',
  ytm: 'доходность к погашению',
  ml_model_unavailable: 'модель восстановления метрик недоступна',
  ml_features: 'нет признаков для восстановления метрик',
  ml_settlement_calendar: 'нет точного календаря расчётов для ML',
  ml_maturity_date: 'нет корректной даты погашения для ML',
  ml_yield_date: 'нет корректной даты, к которой рассчитана доходность',
  ml_coupon_type: 'тип купона не поддерживается ML',
  ml_structure: 'структура бумаги не поддерживается ML',
  ml_face_value: 'нет корректного номинала для ML',
  ml_currency: 'не указана валюта для ML',
}

export function parameterName(code: string): string {
  if (code.startsWith('fx_rate_')) return `курс ${code.slice(8)} к рублю`
  return parameterNames[code] ?? 'необходимые рыночные данные'
}

export function canCalculateInstrument(instrument: InstrumentDetails): boolean {
  if (!instrument.calculation_status) return instrument.ready_for_calculation
  if (instrument.calculation_status === 'ready') return true
  if (instrument.calculation_status !== 'estimate_possible') return false
  return (
    instrument.price_clean !== null &&
    instrument.accrued_int !== null &&
    instrument.missing_parameters.every((code) => code === 'duration_mod' || code === 'convexity')
  )
}

export function missingParameters(instrument: InstrumentDetails): string {
  return (
    [...new Set(instrument.missing_parameters.map(parameterName))].join(', ') || 'рыночные данные'
  )
}

export function instrumentAmount(
  value: number | null,
  currency: string | null | undefined,
): string {
  if (value === null) return 'Нет данных'
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value)} ${currency ?? '(валюта не указана)'}`
}
