import { useEffect, useId, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { ApiError } from '../../api/client'
import { calculateStress, StressError, validShift } from '../../api/stressScenarios'
import type { StressScenario as Scenario } from '../../api/stressScenarios'
import type { RiskCalculationResponse } from '../../types/risk'
import '../../styles/stress-scenario.css'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: Scenario }
  | { status: 'error'; message: string }

function errorMessage(error: unknown): string {
  if (error instanceof StressError) {
    if (error.code === 'timeout') return 'Время ожидания истекло. Попробуйте ещё раз'
    if (error.code === 'invalid_shift') return 'Укажите сдвиг от −200 до +200 bp'
    return 'Ответ сценария не соответствует исходному расчёту. Повторите запрос'
  }
  if (error instanceof ApiError) {
    if (error.code === 'calculation_not_found')
      return 'Сохранённый расчёт не найден. Рассчитайте риск заново'
    if (error.code === 'invalid_shift') return 'Укажите сдвиг от −200 до +200 bp'
    if (error.code === 'invalid_calculation')
      return 'В сохранённом расчёте недостаточно данных для сценария. Рассчитайте риск заново'
    if (error.status === 404) return 'Сервис стресс-сценариев пока недоступен'
  }
  return 'Не удалось рассчитать стресс-сценарий. Попробуйте ещё раз'
}

export default function StressScenario({ calculation }: { calculation: RiskCalculationResponse }) {
  const id = useId()
  const [shift, setShift] = useState('100')
  const [state, setState] = useState<State>({ status: 'idle' })
  const run = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const valid = validShift(shift)

  useEffect(
    () => () => {
      run.current += 1
      controller.current?.abort()
    },
    [],
  )

  function changeShift(value: string) {
    run.current += 1
    controller.current?.abort()
    controller.current = null
    setShift(value)
    setState({ status: 'idle' })
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!valid || state.status === 'loading') return
    const current = ++run.current
    const request = new AbortController()
    controller.current = request
    setState({ status: 'loading' })
    try {
      const result = await calculateStress(calculation, Number(shift), request.signal)
      if (current !== run.current || request.signal.aborted) return
      setState({ status: 'success', result })
    } catch (error) {
      if (current !== run.current || request.signal.aborted) return
      setState({ status: 'error', message: errorMessage(error) })
    } finally {
      if (current === run.current) controller.current = null
    }
  }

  return (
    <section className="stress-scenario" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Стресс-сценарий</h3>
      <p>Как изменится стоимость сделки при сдвиге доходности? 100 bp = 1 процентный пункт.</p>
      <form onSubmit={submit} noValidate>
        <div className="deal-form__input-row deal-form__input-row--quantity">
          <label htmlFor={`${id}-number`}>Сдвиг доходности, bp:</label>
          <div className="deal-form__stepper">
            <button
              type="button"
              className="deal-form__stepper-button"
              aria-label="Уменьшить сдвиг доходности"
              disabled={valid && Number(shift) <= -200}
              onClick={() => changeShift(String(Math.max(-200, (valid ? Number(shift) : 0) - 1)))}
            >
              −
            </button>
            <input
              id={`${id}-number`}
              type="number"
              min={-200}
              max={200}
              step="any"
              value={shift}
              aria-invalid={!valid}
              aria-describedby={`${id}-hint`}
              onChange={(event) => changeShift(event.target.value)}
            />
            <button
              type="button"
              className="deal-form__stepper-button"
              aria-label="Увеличить сдвиг доходности"
              disabled={valid && Number(shift) >= 200}
              onClick={() => changeShift(String(Math.min(200, (valid ? Number(shift) : 0) + 1)))}
            >
              +
            </button>
          </div>
        </div>
        <label className="stress-scenario__range-label" htmlFor={`${id}-range`}>
          Сдвиг доходности ползунком
        </label>
        <input
          id={`${id}-range`}
          className="stress-scenario__range"
          type="range"
          min={-200}
          max={200}
          step="any"
          value={valid ? Number(shift) : 0}
          onChange={(event) =>
            changeShift(String(Math.round(Number(event.target.value) * 100) / 100))
          }
          aria-describedby={`${id}-hint`}
          aria-valuetext={`${valid ? shift : 0} bp`}
        />
        <div className="stress-scenario__bounds" aria-hidden="true">
          <span>−200 bp</span>
          <span>0</span>
          <span>+200 bp</span>
        </div>
        <p id={`${id}-hint`}>
          {valid
            ? 'Отрицательный сдвиг — снижение доходности, положительный — рост.'
            : 'Укажите число от −200 до +200 bp.'}
        </p>
        <button
          className="home-page__calculate-button"
          type="submit"
          disabled={!valid || state.status === 'loading'}
        >
          {state.status === 'loading' ? 'Считаем сценарий…' : 'Рассчитать стресс-сценарий'}
        </button>
      </form>
      {state.status === 'loading' && <p role="status">Рассчитываем изменение стоимости</p>}
      {state.status === 'error' && (
        <p role="alert" className="stress-scenario__error">
          {state.message}
        </p>
      )}
      {state.status === 'success' && (
        <div className="stress-scenario__result" role="status">
          <p>
            Изменение стоимости при {state.result.shift_bp > 0 ? '+' : ''}
            {state.result.shift_bp} bp
          </p>
          <strong>
            {new Intl.NumberFormat('ru-RU', {
              maximumFractionDigits: 4,
              signDisplay: 'exceptZero',
            }).format(state.result.total_change_rub)}{' '}
            ₽
          </strong>
          <p>
            {state.result.approximate
              ? 'Приближённая оценка по дюрации и выпуклости.'
              : 'Результат сценария.'}{' '}
            Данные исходного расчёта от {state.result.as_of_date.slice(0, 10)}.
          </p>
          {state.result.estimated && (
            <p>Использованы метрики, восстановленные ML. Учитывайте ограничения оценок выше.</p>
          )}
          {import.meta.env.VITE_USE_MOCK_API === 'true' && <p>Демонстрационный сценарий</p>}
        </div>
      )}
    </section>
  )
}
