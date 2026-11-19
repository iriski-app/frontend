import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('getExplanation', () => {
  it('сохраняет ограничения и признак отсутствия подробного разбора', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            calculation_id: 'calc',
            text: 'Текст',
            validation_ok: true,
            sources: ['total_rub'],
            calculation_details_available: false,
            limitations: ['Приближённый расчёт'],
          }),
        ),
      ),
    )
    const { getExplanation } = await import('./explanations')
    expect(await getExplanation('calc', -1)).toMatchObject({
      calculationDetailsAvailable: false,
      limitations: ['Приближённый расчёт'],
    })
  })

  it('в обычном режиме запрашивает объяснение только по ID расчёта', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    const response = {
      calculation_id: 'calc-1',
      text: 'Проверенный текст',
      validation_ok: true,
      sources: ['Сохранённый расчёт'],
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => response,
    })
    vi.stubGlobal('fetch', fetchMock)
    const { getExplanation } = await import('./explanations')

    await expect(getExplanation('calc-1', -2)).resolves.toEqual({
      calculationId: 'calc-1',
      text: 'Проверенный текст',
      sources: ['Сохранённый расчёт'],
      mode: 'verified',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/risk-calculations/calc-1/explanations',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        signal: expect.any(AbortSignal),
      }),
    )
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
  })

  it('не показывает непроверенный ответ или ответ другого расчёта', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { getExplanation } = await import('./explanations')

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        calculation_id: 'calc-1',
        text: 'Текст',
        validation_ok: false,
        sources: [],
      }),
    })
    await expect(getExplanation('calc-1', 1)).rejects.toMatchObject({ code: 'unverified' })

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        calculation_id: 'another-calc',
        text: 'Чужой текст',
        validation_ok: true,
        sources: [],
      }),
    })
    await expect(getExplanation('calc-1', 1)).rejects.toMatchObject({
      code: 'invalid_response',
    })
  })

  it('в моковом режиме явно помечает пример и не вызывает backend', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'true')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { getExplanation } = await import('./explanations')

    const explanation = await getExplanation('demo-calc', -2)

    expect(explanation.mode).toBe('demo')
    expect(explanation.text).toContain('уменьшится')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('прерывает зависший запрос через 30 секунд', async () => {
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    vi.useFakeTimers()
    const fetchMock = vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('Запрос отменён', 'AbortError'))
          })
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { getExplanation } = await import('./explanations')

    const result = getExplanation('calc-1', 1)
    const assertion = expect(result).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(30_000)
    await assertion
  })
})
