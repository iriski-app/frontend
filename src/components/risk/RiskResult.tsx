import type { RiskCalculationResponse } from '../../types/risk'

interface RiskResultProps {
  result: RiskCalculationResponse
}

function formatMetric(value: number | null): string {
  if (value === null) {
    return 'Нет данных'
  }

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 4,
  }).format(value)
}

function RiskResult({ result }: RiskResultProps) {
  const isMock = result.dataSource === 'mock'

  const fields = [
    { label: 'DV01', value: formatMetric(result.dv01) },
    {
      label: 'DV01 в рублях',
      value: result.dv01Rub === null ? 'Нет данных' : `${formatMetric(result.dv01Rub)} ₽`,
    },
    { label: 'Нижняя граница DV01', value: formatMetric(result.dv01Low) },
    { label: 'Верхняя граница DV01', value: formatMetric(result.dv01High) },
    { label: 'Валюта', value: result.currency || 'Нет данных' },
    { label: 'Источник данных', value: result.dataSource ?? 'Не указан' },
    { label: 'ID расчёта', value: result.calculationId },
  ]

  return (
    <section className="risk-result" aria-label="Результат расчёта риска">
      <h2>Результаты расчёта</h2>

      {isMock && (
        <p className="risk-result__notice" role="status">
          Демонстрационные данные. Финансовый расчёт не выполнялся.
        </p>
      )}

      <dl className="risk-result__list">
        {fields.map((field) => (
          <div className="risk-result__item" key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default RiskResult
