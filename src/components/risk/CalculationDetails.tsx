import type { CalculationPositionResponse } from '../../types/risk'

const number = (value: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 }).format(value)

export default function CalculationDetails({
  position,
}: {
  position: CalculationPositionResponse
}) {
  const conversions = [
    {
      label: 'Цена',
      currency: position.price_currency,
      rate: position.price_fx_rate,
      date: position.price_fx_date,
      source: position.price_fx_source,
    },
    {
      label: 'НКД',
      currency: position.accrued_int_currency,
      rate: position.accrued_int_fx_rate,
      date: position.accrued_int_fx_date,
      source: position.accrued_int_fx_source,
    },
  ]
  const estimates = [
    { label: 'Дюрация', value: position.duration_estimate },
    { label: 'Выпуклость', value: position.convexity_estimate },
  ]
  return (
    <div className="calculation-details">
      {conversions
        .filter((fx) => fx.rate != null && fx.currency)
        .map((fx) => (
          <p key={fx.label}>
            {fx.label}: 1 {fx.currency} = {number(fx.rate!)} RUB
            {fx.date && ` · ${fx.date.slice(0, 10)}`}
            {fx.source && ` · источник: ${fx.source === 'cbr' ? 'Банк России' : fx.source}`}
          </p>
        ))}
      {estimates.map(
        ({ label, value }) =>
          value && (
            <div key={label}>
              <p>
                {label}: оценка ML · {value.source} · модель {value.model_version}
              </p>
              {(value.low != null || value.high != null) && (
                <p>
                  Диапазон оценки: {value.low == null ? 'не указан' : number(value.low)} —{' '}
                  {value.high == null ? 'не указан' : number(value.high)}
                </p>
              )}
              {value.review_required && <p role="status">Оценка требует проверки специалистом</p>}
              {!!value.limitations?.length && (
                <ul>
                  {value.limitations.map((limitation, index) => (
                    <li key={index}>{limitation}</li>
                  ))}
                </ul>
              )}
            </div>
          ),
      )}
    </div>
  )
}
