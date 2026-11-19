import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockRiskCalculation } from '../mocks/riskCalculations'

const calculation = { ...mockRiskCalculation, status: 'success' }
const scenario = {
  calculation_id: calculation.id,
  as_of_date: calculation.as_of_date,
  shift_bp: 100,
  currency: 'RUB',
  approximate: true,
  estimated: false,
  total_change_rub: -200,
  positions: [
    { position_id: calculation.positions[0].id, side: 'buy', change_rub: -200, estimated: false },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('стресс-сценарий API', () => {
  it('передаёт сдвиг и ID сохранённого расчёта с cookie, без ML-анализа', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(scenario)))
    vi.stubGlobal('fetch', fetchMock)
    const { calculateStress } = await import('./stressScenarios')
    expect(await calculateStress(calculation, 100)).toEqual(scenario)
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/risk-calculations/${calculation.id}/stress-scenarios`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ shift_bp: 100, include_ml_analysis: false }),
        signal: expect.any(AbortSignal),
      }),
    )
  })
  it.each([-201, 201, NaN, Infinity])('не отправляет недопустимый сдвиг %s', async (shift) => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { calculateStress } = await import('./stressScenarios')
    await expect(calculateStress(calculation, shift)).rejects.toMatchObject({
      code: 'invalid_shift',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it.each([
    { calculation_id: 'other' },
    { shift_bp: 50 },
    { total_change_rub: null },
    { total_change_rub: 999 },
    { positions: [] },
    { as_of_date: '2020-01-01' },
  ])('отклоняет несогласованный ответ %j', async (change) => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...scenario, ...change }))),
    )
    const { calculateStress } = await import('./stressScenarios')
    await expect(calculateStress(calculation, 100)).rejects.toMatchObject({
      code: 'invalid_response',
    })
  })
  it('обрабатывает таймаут', async () => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, options: RequestInit) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () =>
              reject(new DOMException('', 'AbortError')),
            )
          }),
      ),
    )
    const { calculateStress } = await import('./stressScenarios')
    const assertion = expect(calculateStress(calculation, 100)).rejects.toMatchObject({
      code: 'timeout',
    })
    await vi.advanceTimersByTimeAsync(30_000)
    await assertion
  })
  it('demo: ноль, границы, дробный сдвиг, знак продажи и согласованность с DV01', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true')
    vi.resetModules()
    const { calculateRisk } = await import('./riskCalculations')
    const { calculateStress } = await import('./stressScenarios')
    const buy = await calculateRisk([{ isin: 'RU000A100006', side: 'buy', quantity: 3 }])
    const sell = await calculateRisk([{ isin: 'RU000A100006', side: 'sell', quantity: 3 }])
    expect((await calculateStress(buy, 0)).total_change_rub).toBe(0)
    expect((await calculateStress(buy, 1)).total_change_rub).toBeCloseTo(buy.total_dv01_rub!)
    for (const shift of [-200, 2.5, 200]) {
      expect((await calculateStress(buy, shift)).total_change_rub).toBeCloseTo(
        -(await calculateStress(sell, shift)).total_change_rub,
      )
    }
  })
})
