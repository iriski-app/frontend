import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('calculateRisk', () => {
  it('отправляет все позиции одним запросом и сохраняет cookie-сессию', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    const response = {
      id: 'calc',
      status: 'success',
      as_of_date: '2026-11-15',
      total_dv01_rub: 1,
      positions: [],
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => response })
    vi.stubGlobal('fetch', fetchMock)
    const { calculateRisk } = await import('./riskCalculations')
    const deals = [
      { isin: 'RU000A100006', side: 'buy' as const, quantity: 2 },
      { isin: 'RU000A0JX0J2', side: 'sell' as const, quantity: 3 },
    ]

    expect(await calculateRisk(deals)).toEqual(response)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/risk-calculations',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ positions: deals, incomplete: false }),
      }),
    )
  })
})
