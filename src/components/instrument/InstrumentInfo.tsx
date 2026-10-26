import type { InstrumentDetails } from '../../types/instrument'

interface InstrumentInfoProps {
  details: InstrumentDetails
}

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'Нет данных'
  }

  return String(value)
}

function InstrumentInfo({ details }: InstrumentInfoProps) {
  const { instrument, marketData } = details

  const instrumentFields = [
    { label: 'ISIN', value: instrument.isin },
    { label: 'Название', value: instrument.name },
    { label: 'Эмитент', value: instrument.issuerName },
    { label: 'Тип инструмента', value: instrument.instrumentType },
    { label: 'Валюта', value: instrument.currency },
    { label: 'Номинал', value: instrument.faceValue },
    { label: 'Тип купона', value: instrument.couponType },
    { label: 'Частота купона', value: instrument.couponFreq },
    { label: 'Купонная ставка', value: instrument.couponRate },
    { label: 'Дата погашения', value: instrument.maturityDate },
  ]

  const marketFields = marketData
    ? [
        { label: 'Тип цены', value: marketData.priceType },
        { label: 'Чистая цена', value: marketData.priceClean },
        {
          label: 'Накопленный купонный доход',
          value: marketData.accruedInt,
        },
        {
          label: 'Модифицированная дюрация',
          value: marketData.durationMod,
        },
        { label: 'Выпуклость', value: marketData.convexity },
        { label: 'Доходность к погашению', value: marketData.ytm },
        { label: 'Источник рыночных данных', value: marketData.source },
        { label: 'Дата торгов', value: marketData.tradeDate },
        { label: 'Дата загрузки данных', value: marketData.loadedAt },
      ]
    : []

  const fields = [...instrumentFields, ...marketFields]

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

      {marketData === null && (
        <p className="instrument-info__notice">Рыночные данные для этой облигации отсутствуют.</p>
      )}
    </section>
  )
}

export default InstrumentInfo
