import type { RiskCalculationResponse } from '../../types/risk'
import RiskExplanation from './RiskExplanation'

interface RiskResultProps {
  result: RiskCalculationResponse
}

function formatDV01(value: number | null): string {
  if (value === null) {
    return 'Нет данных'
  }

  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 4,
  }).format(value)
}

function RiskResult({ result }: RiskResultProps) {
  const isMock = result.positions.some((position) => position.source === 'mock')

  return (
    <section className="risk-result" aria-label="Результат расчёта риска">
      <h2>Результат расчёта</h2>

      {isMock && (
        <p className="risk-result__notice" role="status">
          Демонстрационные данные
        </p>
      )}

      <p className="risk-result__description">
        Чувствительность стоимости сделки к изменению ставки на 1 базисный пункт
      </p>

      <div className="risk-result__metric">
        <span className="risk-result__metric-label">DV01 сделки</span>

        <strong className="risk-result__metric-value">
          {formatDV01(result.total_dv01_rub)}
          {result.total_dv01_rub !== null && <span className="risk-result__currency"> ₽</span>}
        </strong>
      </div>

      <section className="risk-result__explanation" aria-labelledby="risk-explanation-title">
        <h3 id="risk-explanation-title">Объяснение результата</h3>

        <RiskExplanation
          key={result.id}
          calculationId={result.id}
          totalDv01Rub={result.total_dv01_rub}
        />
      </section>
    </section>
  )
}

export default RiskResult
