import { apiRequest } from './client'

const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'
const TIMEOUT_MS = 30_000

export interface Explanation {
  calculationId: string
  text: string
  sources: string[]
  mode: 'verified' | 'demo'
}

export class ExplanationError extends Error {
  readonly code: 'timeout' | 'invalid_response' | 'unverified'

  constructor(code: 'timeout' | 'invalid_response' | 'unverified') {
    super(code)
    this.name = 'ExplanationError'
    this.code = code
  }
}

function parseExplanation(value: unknown, calculationId: string): Explanation {
  if (!value || typeof value !== 'object') throw new ExplanationError('invalid_response')
  const data = value as Record<string, unknown>
  const responseId = data.calculation_id ?? data.calc_run_id
  const text = data.text ?? data.answer
  const sources = data.sources ?? data.fact_sources
  const verified =
    data.validation_ok !== false &&
    data.validation_status !== 'failed' &&
    (data.validation_ok === true || data.validation_status === 'verified')

  if (responseId !== calculationId) throw new ExplanationError('invalid_response')
  if (!verified) throw new ExplanationError('unverified')
  if (typeof text !== 'string' || !text.trim()) throw new ExplanationError('invalid_response')
  if (!Array.isArray(sources) || !sources.every((source) => typeof source === 'string')) {
    throw new ExplanationError('invalid_response')
  }

  return { calculationId, text: text.trim(), sources, mode: 'verified' }
}

function mockExplanation(calculationId: string, totalDv01Rub: number | null): Explanation {
  const amount =
    totalDv01Rub === null
      ? ''
      : ` примерно на ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(Math.abs(totalDv01Rub))} ₽`
  const change =
    totalDv01Rub === null
      ? 'В демонстрационном расчёте не удалось определить направление изменения стоимости'
      : totalDv01Rub < 0
        ? `При росте доходности на 1 bp оценочная стоимость уменьшится${amount}`
        : totalDv01Rub > 0
          ? `При росте доходности на 1 bp оценочная стоимость увеличится${amount}`
          : 'При росте доходности на 1 bp оценочная стоимость почти не изменится'

  return {
    calculationId,
    text: `${change}. Это приближённая чувствительность DV01, а не прогноз рыночной цены`,
    sources: ['Демонстрационные данные расчёта'],
    mode: 'demo',
  }
}

export async function getExplanation(
  calculationId: string,
  totalDv01Rub: number | null,
  signal?: AbortSignal,
): Promise<Explanation> {
  if (USE_MOCK_API) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Запрос отменён', 'AbortError'))
        return
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort)
        resolve(mockExplanation(calculationId, totalDv01Rub))
      }, 450)
      function onAbort() {
        clearTimeout(timer)
        reject(new DOMException('Запрос отменён', 'AbortError'))
      }
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  if (signal?.aborted) controller.abort()

  try {
    const response = await apiRequest<unknown>(
      `/risk-calculations/${encodeURIComponent(calculationId)}/explanations`,
      { method: 'POST', signal: controller.signal },
    )
    return parseExplanation(response, calculationId)
  } catch (error) {
    if (timedOut) throw new ExplanationError('timeout')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
