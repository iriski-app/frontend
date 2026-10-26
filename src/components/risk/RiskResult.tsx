import type { RiskCalculationResponse } from '../../types/risk'

interface RiskResultProps {
  result: RiskCalculationResponse
}

function RiskResult({ result }: RiskResultProps) {
  const isMock = result.dataSource === 'mock'

  function formatMetric(value: number | null): string {
    return value === null
      ? 'Нет данных'
      : new Intl.NumberFormat('ru-RU', {
          maximumFractionDigits: 4,
        }).format(value)
  }

  return (
    <section className="risk-result" aria-label="Результат расчёта риска">
      <h2>Результаты расчёта</h2>

      {isMock && <p role="status">Демонстрационные данные. Финансовый расчёт не выполнялся.</p>}

      <dl>
        <dt>DV01</dt>
        <dd>{formatMetric(result.dv01)}</dd>

        <dt>DV01 в рублях</dt>
        <dd>{formatMetric(result.dv01Rub)} ₽</dd>

        <dt>Нижняя граница DV01</dt>
        <dd>{formatMetric(result.dv01Low)}</dd>

        <dt>Верхняя граница DV01</dt>
        <dd>{formatMetric(result.dv01High)}</dd>

        <dt>Источник данных</dt>
        <dd>{result.dataSource ?? 'Не указан'}</dd>
      </dl>
    </section>
  )
}

export default RiskResult
