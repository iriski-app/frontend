import { apiRequest } from './client'
import { mockInstruments } from '../mocks/instruments'
import type { RiskCalculationResponse } from '../types/risk'

export interface StressScenario {
  calculation_id: string
  as_of_date: string
  shift_bp: number
  currency: 'RUB'
  approximate: boolean
  estimated: boolean
  total_change_rub: number
  positions: {
    position_id: string
    side: 'buy' | 'sell'
    change_rub: number
    estimated: boolean
  }[]
}

export class StressError extends Error {
  readonly code: 'invalid_shift' | 'invalid_response' | 'timeout'

  constructor(code: 'invalid_shift' | 'invalid_response' | 'timeout') {
    super(code)
    this.name = 'StressError'
    this.code = code
  }
}

export function validShift(value: string): boolean {
  return (
    value.trim() !== '' &&
    Number.isFinite(Number(value)) &&
    Number(value) >= -200 &&
    Number(value) <= 200
  )
}

function parseScenario(
  value: unknown,
  calculation: RiskCalculationResponse,
  shift: number,
): StressScenario {
  if (!value || typeof value !== 'object') throw new StressError('invalid_response')
  const data = value as StressScenario
  if (
    data.calculation_id !== calculation.id ||
    data.shift_bp !== shift ||
    data.currency !== 'RUB' ||
    typeof data.as_of_date !== 'string' ||
    data.as_of_date !== calculation.as_of_date ||
    typeof data.approximate !== 'boolean' ||
    typeof data.estimated !== 'boolean' ||
    !Number.isFinite(data.total_change_rub) ||
    !Array.isArray(data.positions) ||
    data.positions.length !== calculation.positions.length
  )
    throw new StressError('invalid_response')
  const seen = new Set<string>()
  for (const position of data.positions) {
    const original = calculation.positions.find((item) => item.id === position?.position_id)
    if (
      !original ||
      seen.has(position.position_id) ||
      position.side !== original.side ||
      !Number.isFinite(position.change_rub) ||
      typeof position.estimated !== 'boolean'
    ) {
      throw new StressError('invalid_response')
    }
    seen.add(position.position_id)
  }
  const sum = data.positions.reduce((total, position) => total + position.change_rub, 0)
  if (
    !Number.isFinite(sum) ||
    Math.abs(sum - data.total_change_rub) > Math.max(0.000001, Math.abs(sum) * 1e-9)
  ) {
    throw new StressError('invalid_response')
  }
  return data
}

export async function calculateStress(
  calculation: RiskCalculationResponse,
  shift: number,
  signal?: AbortSignal,
): Promise<StressScenario> {
  if (!validShift(String(shift))) throw new StressError('invalid_shift')
  if (signal?.aborted) throw new DOMException('Запрос отменён', 'AbortError')
  if (import.meta.env.VITE_USE_MOCK_API === 'true') {
    const positions = calculation.positions.map((position) => {
      const instrument = Object.values(mockInstruments).find(
        (item) => item.id === position.instrument_id,
      )
      if (
        !instrument ||
        position.market_value === null ||
        position.duration_mod === null ||
        instrument.convexity === null
      ) {
        throw new StressError('invalid_response')
      }
      const delta = shift / 10_000
      return {
        position_id: position.id,
        side: position.side,
        change_rub:
          position.market_value *
          (-position.duration_mod * delta + 0.5 * instrument.convexity * delta ** 2) *
          (position.side === 'buy' ? 1 : -1),
        estimated: !!(position.duration_estimate || position.convexity_estimate),
      }
    })
    return {
      calculation_id: calculation.id,
      as_of_date: calculation.as_of_date,
      shift_bp: shift,
      currency: 'RUB',
      approximate: true,
      estimated: positions.some((position) => position.estimated),
      total_change_rub: positions.reduce((sum, position) => sum + position.change_rub, 0),
      positions,
    }
  }
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 30_000)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const response = await apiRequest<unknown>(
      `/risk-calculations/${encodeURIComponent(calculation.id)}/stress-scenarios`,
      {
        method: 'POST',
        body: JSON.stringify({ shift_bp: shift, include_ml_analysis: false }),
        signal: controller.signal,
      },
    )
    return parseScenario(response, calculation, shift)
  } catch (error) {
    if (timedOut) throw new StressError('timeout')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
