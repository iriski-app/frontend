import { ApiError } from '../api/client'
import { parameterName } from './instrument'

export function calculationError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Не удалось рассчитать риск. Повторите попытку'
  const messages: Record<string, string> = {
    missing_parameter: 'Отсутствуют необходимые параметры для расчёта риска',
    missing_duration: 'Не удалось получить или восстановить дюрацию облигации',
    calculation_data_not_found: 'Не найдены рыночные данные для расчёта риска',
    fx_rate_not_found: 'Не найден курс валюты к рублю на дату расчёта',
    missing_fx_rate: 'Не найден курс валюты к рублю на дату расчёта',
    unsupported_currency: 'Валюта не поддерживается для расчёта',
    ml_unavailable: 'Сервис восстановления метрик сейчас недоступен. Попробуйте позже',
    ml_unsupported_input: 'Параметры бумаги вне области применения ML-модели',
    calculation_timeout: 'Время ожидания расчёта истекло. Попробуйте ещё раз',
  }
  const details = error.details
  const context = [
    details?.isin || details?.instrument_id,
    details?.field && parameterName(details.field),
    details?.currency,
    details?.as_of_date?.slice(0, 10),
  ].filter(Boolean)
  return `${messages[error.code] ?? 'Не удалось рассчитать риск. Повторите попытку'}${context.length ? ` (${context.join(' · ')})` : ''}`
}
