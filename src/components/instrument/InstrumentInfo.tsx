import type { InstrumentDetails } from '../../types/instrument'

interface InstrumentInfoProps {
  details: InstrumentDetails
}

function InstrumentInfo({ details }: InstrumentInfoProps) {
  const { instrument, marketData } = details

  return (
    <section className="instrument-info" aria-label="Информация об облигации">
      <h3>Информация об облигации</h3>

      <dl>
        <dt>ISIN</dt>
        <dd>{instrument.isin}</dd>

        <dt>Название</dt>
        <dd>{instrument.name}</dd>

        <dt>Эмитент</dt>
        <dd>{instrument.issuerName ?? 'Нет данных'}</dd>

        <dt>Тип инструмента</dt>
        <dd>{instrument.instrumentType ?? 'Нет данных'}</dd>

        <dt>Валюта</dt>
        <dd>{instrument.currency}</dd>

        <dt>Номинал</dt>
        <dd>
          {instrument.faceValue} {instrument.currency}
        </dd>

        <dt>Дата погашения</dt>
        <dd>{instrument.maturityDate ?? 'Нет данных'}</dd>

        <dt>Чистая цена</dt>
        <dd>{marketData?.priceClean ?? 'Нет данных'}</dd>

        <dt>Модифицированная дюрация</dt>
        <dd>{marketData?.durationMod ?? 'Нет данных'}</dd>

        <dt>Источник рыночных данных</dt>
        <dd>{marketData?.source ?? 'Нет данных'}</dd>

        <dt>Дата торгов</dt>
        <dd>{marketData?.tradeDate ?? 'Нет данных'}</dd>
      </dl>
    </section>
  )
}

export default InstrumentInfo
