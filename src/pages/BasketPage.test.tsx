import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { mockInstruments } from '../mocks/instruments'
import { getInstrumentDetails } from '../api/instruments'
import { calculateRisk } from '../api/riskCalculations'
import { getExplanation } from '../api/explanations'
import { ApiError } from '../api/client'

vi.mock('../api/instruments', () => ({ getInstrumentDetails: vi.fn() }))
vi.mock('../api/riskCalculations', () => ({ calculateRisk: vi.fn() }))
vi.mock('../api/explanations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/explanations')>()),
  getExplanation: vi.fn(),
}))

const first = mockInstruments.RU000A100006
const second = mockInstruments.RU000A0JX0J2

beforeEach(() => {
  sessionStorage.clear()
  window.location.hash = '#basket'
  vi.mocked(getInstrumentDetails).mockImplementation(async (isin) => {
    if (isin === first.isin) return first
    if (isin === second.isin)
      return { ...second, ready_for_calculation: false, missing_parameters: ['convexity'] }
    return null
  })
  vi.mocked(calculateRisk).mockResolvedValue({
    id: 'calc',
    status: 'success',
    as_of_date: '2026-11-15',
    total_dv01_rub: -2,
    positions: [
      {
        id: 'result',
        instrument_id: first.id,
        side: 'buy',
        quantity: 1,
        market_value: 1000,
        duration_mod: 2,
        dv01: -2,
        source: 'moex',
        market_date: first.trade_date,
      },
    ],
  })
  vi.mocked(getExplanation).mockResolvedValue({
    calculationId: 'calc',
    text: 'Проверенное объяснение',
    sources: ['Сохранённый расчёт'],
    mode: 'verified',
  })
})

async function add(user: ReturnType<typeof userEvent.setup>, isin: string) {
  await user.type(screen.getByRole('textbox', { name: /ISIN/i }), isin)
  await user.click(screen.getByRole('button', { name: 'Добавить' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Добавить' })).toBeEnabled())
}

describe('страница корзины', () => {
  it('включает estimate_possible, показывает ML/FX и сохраняет их после перезагрузки', async () => {
    const user = userEvent.setup()
    vi.mocked(getInstrumentDetails).mockResolvedValue({
      ...first,
      currency: 'USD',
      price_currency: 'USD',
      accrued_int_currency: 'RUB',
      ready_for_calculation: false,
      calculation_status: 'estimate_possible',
      duration_mod: null,
      missing_parameters: ['duration_mod'],
    })
    const response = await vi.mocked(calculateRisk).getMockImplementation()!([])
    vi.mocked(calculateRisk).mockResolvedValue({
      ...response,
      positions: [
        {
          ...response.positions[0],
          price_currency: 'USD',
          accrued_int_currency: 'RUB',
          price_fx_rate: 95,
          price_fx_date: '2026-11-15',
          price_fx_source: 'cbr',
          duration_estimate: {
            source: 'catboost',
            model_version: 'v1',
            low: 1.8,
            high: 2.2,
            review_required: true,
            limitations: ['Оценка по модели'],
          },
        },
      ],
    })
    const view = render(<App />)
    await add(user, first.isin)
    expect(
      within(screen.getByText('Цена бумаги').parentElement!).getByText('1 000 USD'),
    ).toBeInTheDocument()
    expect(screen.getByText('15,5 RUB')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    expect(await screen.findByText(/Итог:/)).toBeInTheDocument()
    expect(calculateRisk).toHaveBeenCalledWith(
      [{ isin: first.isin, side: 'buy', quantity: 1 }],
      false,
    )
    expect(screen.getByText(/источник: Банк России/)).toBeInTheDocument()
    expect(screen.getByText('Оценка требует проверки специалистом')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Рассчитать стресс-сценарий' }),
    ).not.toBeInTheDocument()
    view.unmount()
    render(<App />)
    expect(screen.getByText(/модель v1/)).toBeInTheDocument()
    expect(screen.getByText('Оценка по модели')).toBeInTheDocument()
  })

  it('показывает контекст отсутствующего FX и не оставляет успешный итог', async () => {
    const user = userEvent.setup()
    render(<App />)
    await add(user, first.isin)
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    expect(await screen.findByText(/Итог:/)).toBeInTheDocument()
    vi.mocked(calculateRisk).mockRejectedValueOnce(
      new ApiError(422, 'missing_fx_rate', 'missing', {
        isin: first.isin,
        field: 'price_clean',
        currency: 'CNY',
        as_of_date: '2026-11-19',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      `Не найден курс валюты к рублю на дату расчёта (${first.isin} · чистая цена · CNY · 2026-11-19)`,
    )
    expect(screen.queryByText(/Итог:/)).not.toBeInTheDocument()
  })

  it('получает объяснение по ID, показывает загрузку и сохраняет ответ в этой вкладке', async () => {
    const user = userEvent.setup()
    let resolveExplanation!: (value: Awaited<ReturnType<typeof getExplanation>>) => void
    vi.mocked(getExplanation).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveExplanation = resolve
      }),
    )
    const view = render(<App />)
    await add(user, first.isin)
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    await waitFor(() => expect(screen.getByText(/Итог:/)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Получить объяснение' }))
    expect(getExplanation).toHaveBeenCalledWith('calc', -2, expect.any(AbortSignal))
    expect(screen.getByText('Готовим объяснение для этого расчёта')).toBeInTheDocument()
    expect(screen.getByText(/Итог:/)).toBeInTheDocument()

    resolveExplanation({
      calculationId: 'calc',
      text: 'Проверенное объяснение',
      sources: ['Сохранённый расчёт'],
      mode: 'verified',
    })
    await waitFor(() => expect(screen.getByText('Проверенное объяснение')).toBeInTheDocument())
    expect(screen.getByText('Сохранённый расчёт')).toBeInTheDocument()

    view.unmount()
    render(<App />)
    expect(screen.getByText('Проверенное объяснение')).toBeInTheDocument()
    expect(getExplanation).toHaveBeenCalledTimes(1)
  })

  it('оставляет расчёт видимым при ошибке объяснения и позволяет повторить запрос', async () => {
    const user = userEvent.setup()
    vi.mocked(getExplanation).mockRejectedValueOnce(
      new ApiError(503, 'explanation_unavailable', 'error'),
    )
    render(<App />)
    await add(user, first.isin)
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    await waitFor(() => expect(screen.getByText(/Итог:/)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Получить объяснение' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Сервис объяснений сейчас недоступен'),
    )
    expect(screen.getByText(/Итог:/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Повторить запрос' }))
    await waitFor(() => expect(screen.getByText('Проверенное объяснение')).toBeInTheDocument())
    expect(getExplanation).toHaveBeenCalledTimes(2)
  })

  it('игнорирует запоздалое объяснение после изменения корзины', async () => {
    const user = userEvent.setup()
    let resolveExplanation!: (value: Awaited<ReturnType<typeof getExplanation>>) => void
    vi.mocked(getExplanation).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveExplanation = resolve
      }),
    )
    render(<App />)
    await add(user, first.isin)
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    await waitFor(() => expect(screen.getByText(/Итог:/)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Получить объяснение' }))
    await user.click(screen.getByRole('button', { name: `Редактировать ${first.name}` }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    resolveExplanation({
      calculationId: 'calc',
      text: 'Устаревшее объяснение',
      sources: [],
      mode: 'verified',
    })
    expect(screen.queryByText('Устаревшее объяснение')).not.toBeInTheDocument()
    expect(screen.queryByText(/Итог:/)).not.toBeInTheDocument()
  })

  it('ограничивает количество при добавлении и редактировании', async () => {
    const user = userEvent.setup()
    render(<App />)
    const addQuantity = screen.getByRole('textbox', { name: 'Количество бумаг' })
    await user.clear(addQuantity)
    await user.type(addQuantity, '10000000000000000000000000000')
    expect(addQuantity).toHaveValue('1000000000')
    expect(screen.getByRole('button', { name: 'Увеличить количество бумаг' })).toBeDisabled()

    await add(user, first.isin)
    await user.click(screen.getByRole('button', { name: `Редактировать ${first.name}` }))
    const editQuantity = within(screen.getByRole('article', { name: first.name })).getByRole(
      'textbox',
      { name: 'Количество бумаг' },
    )
    await user.clear(editQuantity)
    await user.type(editQuantity, '10000000000000000000000000000')
    expect(editQuantity).toHaveValue('1000000000')
    expect(
      screen.getByRole('button', { name: `Увеличить количество для ${first.name}` }),
    ).toBeDisabled()
  })

  it('добавляет бумагу, запрещает дубликат и восстанавливает карточку без нового запроса', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await add(user, first.isin)
    expect(screen.getByText(first.name)).toBeInTheDocument()
    expect(screen.getByText('Количество сделок в корзине: 1')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /ISIN/i }), first.isin)
    await user.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(screen.getByRole('alert')).toHaveTextContent('уже есть')
    expect(getInstrumentDetails).toHaveBeenCalledTimes(1)
    view.unmount()
    render(<App />)
    expect(screen.getByText(first.name)).toBeInTheDocument()
    expect(getInstrumentDetails).toHaveBeenCalledTimes(1)
  })

  it('исключает неготовую позицию, считает готовую и сбрасывает итог после изменения', async () => {
    const user = userEvent.setup()
    render(<App />)
    await add(user, first.isin)
    await add(user, second.isin)
    expect(screen.getByText(/Расчёт недоступен: выпуклость/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    await waitFor(() => expect(screen.getByText(/Итог:/)).toBeInTheDocument())
    expect(calculateRisk).toHaveBeenCalledWith(
      [{ isin: first.isin, side: 'buy', quantity: 1 }],
      true,
    )
    expect(screen.queryByText(/Расчёт по данным от/)).not.toBeInTheDocument()
    expect(screen.getByText(/Рассчитано 1 из 2 позиций/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: `Редактировать ${first.name}` }))
    const editQuantity = within(screen.getByRole('article', { name: first.name })).getByRole(
      'textbox',
      { name: 'Количество бумаг' },
    )
    await user.clear(editQuantity)
    await user.type(editQuantity, '2')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(screen.queryByText(/Итог:/)).not.toBeInTheDocument()
  })

  it('возвращает удалённую бумагу и игнорирует запоздавший расчёт', async () => {
    const user = userEvent.setup()
    let resolveCalculation!: (value: Awaited<ReturnType<typeof calculateRisk>>) => void
    vi.mocked(calculateRisk).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCalculation = resolve
      }),
    )
    render(<App />)
    await add(user, first.isin)
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    await user.click(screen.getByRole('button', { name: `Удалить ${first.name}` }))
    expect(screen.getByText(/Корзина пуста/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Вернуть' }))
    expect(screen.getByText(first.name)).toBeInTheDocument()
    resolveCalculation({
      id: 'old',
      status: 'success',
      as_of_date: '2026-11-15',
      total_dv01_rub: -2,
      positions: [
        {
          id: 'result',
          instrument_id: first.id,
          side: 'buy',
          quantity: 1,
          market_value: 1000,
          duration_mod: 2,
          dv01: -2,
          source: 'moex',
          market_date: '2026-11-15',
        },
      ],
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Рассчитать' })).toBeEnabled())
    expect(screen.queryByText(/Итог:/)).not.toBeInTheDocument()
  })

  it('повторно проверяет неготовую бумагу и включает её после обновления', async () => {
    const user = userEvent.setup()
    vi.mocked(getInstrumentDetails)
      .mockResolvedValueOnce({
        ...second,
        ready_for_calculation: false,
        missing_parameters: ['convexity'],
      })
      .mockResolvedValueOnce(second)
    vi.mocked(calculateRisk).mockResolvedValueOnce({
      id: 'calc-second',
      status: 'success',
      as_of_date: '2026-11-16',
      total_dv01_rub: 3,
      positions: [
        {
          id: 'result-second',
          instrument_id: second.id,
          side: 'buy',
          quantity: 1,
          market_value: 1000,
          duration_mod: 2,
          dv01: 3,
          source: 'moex',
          market_date: '2026-11-16',
        },
      ],
    })

    render(<App />)
    await add(user, second.isin)
    expect(screen.getByText(/Расчёт недоступен: выпуклость/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))

    await waitFor(() =>
      expect(calculateRisk).toHaveBeenCalledWith(
        [{ isin: second.isin, side: 'buy', quantity: 1 }],
        false,
      ),
    )
    expect(screen.getByText('Расчёт по данным от 2026-11-16')).toBeInTheDocument()
    expect(screen.queryByText(/Дата данных расчёта/)).not.toBeInTheDocument()
  })

  it('не считает по старому снимку при ошибке обновления', async () => {
    const user = userEvent.setup()
    render(<App />)
    await add(user, first.isin)
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    await waitFor(() => expect(screen.getByText(/Итог:/)).toBeInTheDocument())
    vi.mocked(getInstrumentDetails).mockRejectedValueOnce(new Error('network'))

    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Не удалось обновить данные'),
    )
    expect(screen.queryByText(/Итог:/)).not.toBeInTheDocument()
    expect(calculateRisk).toHaveBeenCalledTimes(1)
  })

  it('исключает бумагу, которая стала неготовой при обновлении', async () => {
    const user = userEvent.setup()
    vi.mocked(getInstrumentDetails)
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce({
        ...first,
        ready_for_calculation: false,
        missing_parameters: ['duration_mod'],
      })

    render(<App />)
    await add(user, first.isin)
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('нет бумаг, готовых к расчёту'),
    )
    expect(screen.getByText(/Расчёт недоступен: модифицированная дюрация/)).toBeInTheDocument()
    expect(calculateRisk).not.toHaveBeenCalled()
  })
})
