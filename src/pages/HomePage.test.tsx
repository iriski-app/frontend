import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'
import { getInstrumentDetails } from '../api/instruments'
import { calculateRisk } from '../api/riskCalculations'
import { mockInstruments } from '../mocks/instruments'
import { mockRiskCalculation } from '../mocks/riskCalculations'

vi.mock('../api/instruments', () => ({ getInstrumentDetails: vi.fn() }))
vi.mock('../api/riskCalculations', () => ({ calculateRisk: vi.fn() }))
const instrument = mockInstruments.RU000A100006

beforeEach(() => {
  sessionStorage.clear()
  vi.mocked(getInstrumentDetails).mockResolvedValue({
    ...instrument,
    ready_for_calculation: false,
    calculation_status: 'estimate_possible',
    duration_mod: null,
    missing_parameters: ['duration_mod'],
  })
  vi.mocked(calculateRisk).mockResolvedValue(mockRiskCalculation)
})

describe('главная страница', () => {
  it('допускает estimate_possible и показывает сценарий под объяснением только после расчёта', async () => {
    render(<HomePage basketCount={0} onOpenBasket={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: 'Стресс-сценарий' })).not.toBeInTheDocument()
    const isin = screen.getByRole('textbox', { name: 'ISIN:' })
    fireEvent.change(isin, { target: { value: instrument.isin } })
    fireEvent.blur(isin)
    fireEvent.change(screen.getByRole('textbox', { name: 'Количество облигаций:' }), {
      target: { value: '1' },
    })
    const button = screen.getByRole('button', { name: 'Рассчитать риск' })
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByText(/Возможен расчёт с оценкой ML/)).toBeInTheDocument()
    fireEvent.click(button)
    const scenario = await screen.findByRole('heading', { name: 'Стресс-сценарий' })
    expect(calculateRisk).toHaveBeenCalledWith(
      [{ isin: instrument.isin, side: 'buy', quantity: 1 }],
      false,
    )
    expect(
      screen
        .getByRole('heading', { name: 'Объяснение результата' })
        .compareDocumentPosition(scenario) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Количество облигаций:' }), {
      target: { value: '2' },
    })
    expect(screen.queryByRole('heading', { name: 'Стресс-сценарий' })).not.toBeInTheDocument()
  })
})
