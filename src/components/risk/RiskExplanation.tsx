import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { ExplanationError, getExplanation } from '../../api/explanations'
import type { Explanation } from '../../api/explanations'

type ExplanationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; explanation: Explanation }
  | { status: 'error'; message: string }

function storageKey(calculationId: string): string {
  const mode = import.meta.env.VITE_USE_MOCK_API === 'true' ? 'demo' : 'api'
  return `iriski:explanation:v1:${mode}:${calculationId}`
}

function readSaved(calculationId: string): ExplanationState {
  try {
    const raw = sessionStorage.getItem(storageKey(calculationId))
    if (!raw) return { status: 'idle' }
    const value = JSON.parse(raw) as Explanation
    if (
      value.calculationId === calculationId &&
      typeof value.text === 'string' &&
      value.text.trim() &&
      Array.isArray(value.sources) &&
      value.sources.every((source) => typeof source === 'string') &&
      (value.mode === 'verified' || value.mode === 'demo')
    ) {
      return { status: 'success', explanation: value }
    }
  } catch {
    return { status: 'idle' }
  }
  return { status: 'idle' }
}

function errorMessage(error: unknown): string {
  if (error instanceof ExplanationError) {
    switch (error.code) {
      case 'timeout':
        return 'Время ожидания объяснения истекло. Попробуйте ещё раз'
      case 'unverified':
        return 'Объяснение не прошло автоматическую проверку. Повторите запрос'
      case 'invalid_response':
        return 'Сервис вернул неполное объяснение. Попробуйте позже'
    }
  }
  if (error instanceof ApiError) {
    if (error.code === 'calculation_not_found') {
      return 'Сохранённый расчёт не найден. Выполните расчёт заново'
    }
    if (error.status === 404) return 'Сервис объяснений пока не подключён к backend'
    if (error.status === 422) return 'Для объяснения недостаточно данных расчёта'
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return 'Сервис объяснений сейчас недоступен. Попробуйте позже'
    }
  }
  return 'Не удалось получить объяснение. Повторите попытку'
}

interface RiskExplanationProps {
  calculationId: string
  totalDv01Rub: number | null
}

function RiskExplanation({ calculationId, totalDv01Rub }: RiskExplanationProps) {
  const [state, setState] = useState<ExplanationState>(() => readSaved(calculationId))
  const requestRun = useRef(0)
  const controller = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      requestRun.current += 1
      controller.current?.abort()
    },
    [],
  )

  async function requestExplanation() {
    const run = ++requestRun.current
    controller.current?.abort()
    const nextController = new AbortController()
    controller.current = nextController
    setState({ status: 'loading' })

    try {
      const explanation = await getExplanation(calculationId, totalDv01Rub, nextController.signal)
      if (run !== requestRun.current) return
      try {
        sessionStorage.setItem(storageKey(calculationId), JSON.stringify(explanation))
      } catch {
        setState({ status: 'success', explanation })
        return
      }
      setState({ status: 'success', explanation })
    } catch (error) {
      if (run !== requestRun.current || nextController.signal.aborted) return
      setState({ status: 'error', message: errorMessage(error) })
    } finally {
      if (run === requestRun.current) controller.current = null
    }
  }

  return (
    <div className="risk-explanation">
      {state.status === 'idle' && (
        <button type="button" onClick={requestExplanation}>
          Получить объяснение
        </button>
      )}
      {state.status === 'loading' && (
        <>
          <button type="button" disabled>
            Получаем объяснение…
          </button>
          <p role="status">Готовим объяснение для этого расчёта</p>
        </>
      )}
      {state.status === 'error' && (
        <>
          <p className="risk-explanation__error" role="alert">
            {state.message}
          </p>
          <button type="button" onClick={requestExplanation}>
            Повторить запрос
          </button>
        </>
      )}
      {state.status === 'success' && (
        <div className="risk-explanation__answer">
          <p className="risk-explanation__status">
            {state.explanation.mode === 'demo'
              ? 'Демонстрационный текст · модель LLM не вызывалась'
              : 'Объяснение прошло автоматическую проверку'}
          </p>
          <p className="risk-explanation__text">{state.explanation.text}</p>
          {state.explanation.sources.length > 0 && (
            <div className="risk-explanation__sources">
              <span>Источники фактов:</span>
              <ul>
                {state.explanation.sources.map((source, index) => (
                  <li key={`${index}-${source}`}>{source}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RiskExplanation
