import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './client'

describe('apiRequest', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('отправляет GET-запрос с credentials: include', async () => {
    const responseData = { isin: 'RU000A100006' }

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const result = await apiRequest<typeof responseData>('/instruments/RU000A100006')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/instruments/RU000A100006',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      }),
    )

    expect(result).toEqual(responseData)
  })

  it('отправляет POST-запрос с JSON-телом', async () => {
    const requestData = {
      positions: [
        {
          isin: 'RU000A100006',
          side: 'buy',
          quantity: 10,
        },
      ],
    }

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'test-id' }), {
        status: 200,
      }),
    )

    await apiRequest('/risk-calculations', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/risk-calculations',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(requestData),
      }),
    )
  })

  it('обрабатывает успешный ответ 204 без JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 204,
      }),
    )

    const result = await apiRequest<void>('/test')

    expect(result).toBeUndefined()
  })

  it('преобразует HTTP 404 в ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'INSTRUMENT_NOT_FOUND',
          message: 'Облигация не найдена',
        }),
        {
          status: 404,
        },
      ),
    )

    await expect(apiRequest('/instruments/RU000A100006')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'INSTRUMENT_NOT_FOUND',
      message: 'Облигация не найдена',
    })
  })

  it('обрабатывает недостаток рыночных данных (422)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'INSUFFICIENT_MARKET_DATA',
          message: 'Недостаточно рыночных данных',
        }),
        {
          status: 422,
        },
      ),
    )

    await expect(apiRequest('/risk-calculations')).rejects.toMatchObject({
      status: 422,
      code: 'INSUFFICIENT_MARKET_DATA',
      message: 'Недостаточно рыночных данных',
    })
  })

  it('использует запасное сообщение при ошибке сервера', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Internal Server Error', {
        status: 500,
      }),
    )

    await expect(apiRequest('/test')).rejects.toMatchObject({
      status: 500,
      code: 'UNKNOWN_ERROR',
      message: 'Ошибка сервера: 500',
    })
  })

  it('передаёт ошибку соединения без преобразования в ApiError', async () => {
    const networkError = new TypeError('Failed to fetch')

    fetchMock.mockRejectedValueOnce(networkError)

    await expect(apiRequest('/test')).rejects.toBe(networkError)
  })

  it('создаёт правильный экземпляр ApiError', () => {
    const error = new ApiError(404, 'INSTRUMENT_NOT_FOUND', 'Облигация не найдена')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
    expect(error.code).toBe('INSTRUMENT_NOT_FOUND')
    expect(error.message).toBe('Облигация не найдена')
  })
})
