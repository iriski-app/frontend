import type { InstrumentDetails } from '../../types/instrument'

interface InstrumentInfoProps {
  details: InstrumentDetails
}

function formatValue(value: string | number | null): string {
  if (value === null || value === '') {
    return 'Нет данных'
  }

  return String(value)
}

function InstrumentInfo({ details }: InstrumentInfoProps) {
  const fields = [
    { label: 'ISIN', value: details.isin },
    { label: 'Название', value: details.name },
    { label: 'Эмитент', value: details.issuer_name },
    { label: 'Тип инструмента', value: details.instrument_type },
    { label: 'Валюта', value: details.currency },
    { label: 'Номинал', value: details.face_value },
    { label: 'Тип купона', value: details.coupon_type },
    { label: 'Частота купона', value: details.coupon_freq },
    { label: 'Купонная ставка', value: details.coupon_rate },
    { label: 'Дата погашения', value: details.maturity_date },
    { label: 'Тип цены', value: details.price_type },
    { label: 'Чистая цена', value: details.price_clean },
    { label: 'Накопленный купонный доход', value: details.accrued_int },
    { label: 'Модифицированная дюрация', value: details.duration_mod },
    { label: 'Выпуклость', value: details.convexity },
    { label: 'Доходность к погашению', value: details.ytm },
    { label: 'Источник рыночных данных', value: details.source },
    { label: 'Дата торгов', value: details.trade_date },
    { label: 'Дата загрузки данных', value: details.loaded_at },
  ]

  return (
    <section className="instrument-info" aria-labelledby="instrument-info-title">
      <h2 id="instrument-info-title">Информация об облигации</h2>

      <dl className="instrument-info__list">
        {fields.map((field) => (
          <div className="instrument-info__item" key={field.label}>
            <dt>{field.label}</dt>
            <dd>{formatValue(field.value)}</dd>
          </div>
        ))}
      </dl>

      {!details.ready_for_calculation && (
        <div className="instrument-info__notice" role="status">
          <p>Для расчёта риска недостаточно данных.</p>

          {details.missing_parameters.length > 0 && (
            <p>Отсутствующие параметры: {details.missing_parameters.join(', ')}</p>
          )}
        </div>
      )}
    </section>
  )
}

export default InstrumentInfo
