import type { InstrumentDetails } from '../../types/instrument'
import { canCalculateInstrument, instrumentAmount, missingParameters } from '../../utils/instrument'

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
    { label: 'Валюта номинала', value: details.currency },
    { label: 'Номинал', value: details.face_value },
    { label: 'Тип купона', value: details.coupon_type },
    { label: 'Частота купона', value: details.coupon_freq },
    { label: 'Купонная ставка', value: details.coupon_rate },
    { label: 'Дата погашения', value: details.maturity_date },
    { label: 'Тип цены', value: details.price_type },
    {
      label: 'Чистая цена',
      value: instrumentAmount(
        details.price_clean,
        details.price_currency === undefined ? details.currency : details.price_currency,
      ),
    },
    {
      label: 'Накопленный купонный доход',
      value: instrumentAmount(
        details.accrued_int,
        details.accrued_int_currency === undefined
          ? details.currency
          : details.accrued_int_currency,
      ),
    },
    { label: 'Модифицированная дюрация', value: details.duration_mod },
    { label: 'Выпуклость', value: details.convexity },
    { label: 'Доходность к погашению', value: details.ytm },
    { label: 'Источник рыночных данных', value: details.source },
    { label: 'Дата торгов', value: details.trade_date },
    {
      label: 'Данные загружены',
      value: details.loaded_at ? new Date(details.loaded_at).toLocaleString('ru-RU') : null,
    },
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

      {details.calculation_status === 'estimate_possible' && canCalculateInstrument(details) && (
        <p className="instrument-info__notice" role="status">
          Возможен расчёт с оценкой ML: недостающие дюрация или выпуклость будут восстановлены
          моделью. Доступность оценки проверяется при расчёте.
        </p>
      )}
      {!canCalculateInstrument(details) && (
        <div className="instrument-info__notice" role="status">
          <p>Расчёт риска недоступен</p>

          {details.missing_parameters.length > 0 && <p>Причины: {missingParameters(details)}</p>}
        </div>
      )}
    </section>
  )
}

export default InstrumentInfo
