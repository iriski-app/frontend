import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { mockInstruments } from '../mocks/instruments'
import { getInstrumentDetails } from '../api/instruments'
import { calculateRisk } from '../api/riskCalculations'

vi.mock('../api/instruments', () => ({ getInstrumentDetails: vi.fn() }))
vi.mock('../api/riskCalculations', () => ({ calculateRisk: vi.fn() }))

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
})

async function add(user: ReturnType<typeof userEvent.setup>, isin: string) {
  await user.type(screen.getByRole('textbox', { name: /ISIN/i }), isin)
  await user.click(screen.getByRole('button', { name: 'Добавить' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Добавить' })).toBeEnabled())
}

describe('страница корзины', () => {
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
    expect(screen.getByText(/Недостаточно данных: convexity/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))
    await waitFor(() => expect(screen.getByText(/Итог:/)).toBeInTheDocument())
    expect(calculateRisk).toHaveBeenCalledWith([{ isin: first.isin, side: 'buy', quantity: 1 }])
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
    expect(screen.getByText(/Недостаточно данных: convexity/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Рассчитать' }))

    await waitFor(() =>
      expect(calculateRisk).toHaveBeenCalledWith([{ isin: second.isin, side: 'buy', quantity: 1 }]),
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
    expect(screen.getByText(/Недостаточно данных: duration_mod/)).toBeInTheDocument()
    expect(calculateRisk).not.toHaveBeenCalled()
  })
})
