import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StressScenario from './StressScenario'
import { calculateStress } from '../../api/stressScenarios'
import { mockRiskCalculation } from '../../mocks/riskCalculations'
import { ApiError } from '../../api/client'

vi.mock('../../api/stressScenarios', async (original) => ({
  ...(await original<typeof import('../../api/stressScenarios')>()),
  calculateStress: vi.fn(),
}))
const calculation = mockRiskCalculation
const result = {
  calculation_id: calculation.id,
  as_of_date: calculation.as_of_date,
  shift_bp: 100,
  currency: 'RUB' as const,
  approximate: true,
  estimated: false,
  total_change_rub: -200,
  positions: [],
}

beforeEach(() => {
  vi.mocked(calculateStress).mockResolvedValue(result)
})

describe('стресс-сценарий на главной', () => {
  it('синхронизирует ползунок и ввод, вызывает API только кнопкой, сбрасывает старый результат', async () => {
    const user = userEvent.setup()
    render(<StressScenario calculation={calculation} />)
    const input = screen.getByRole('spinbutton')
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '-200' } })
    expect(input).toHaveValue(-200)
    expect(screen.getByRole('button', { name: 'Уменьшить сдвиг доходности' })).toBeDisabled()
    fireEvent.change(input, { target: { value: '200' } })
    expect(slider).toHaveValue('200')
    expect(screen.getByRole('button', { name: 'Увеличить сдвиг доходности' })).toBeDisabled()
    fireEvent.change(input, { target: { value: '2.5' } })
    expect(calculateStress).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Рассчитать стресс-сценарий' }))
    expect(calculateStress).toHaveBeenCalledWith(calculation, 2.5, expect.any(AbortSignal))
    expect(await screen.findByText(/Изменение стоимости при/)).toBeInTheDocument()
    fireEvent.change(slider, { target: { value: '0' } })
    expect(screen.queryByText(/Изменение стоимости при/)).not.toBeInTheDocument()
    expect(calculateStress).toHaveBeenCalledTimes(1)
  })
  it.each(['', '-201', '201'])('блокирует расчёт для ввода %s', (value) => {
    render(<StressScenario calculation={calculation} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value } })
    expect(screen.getByRole('button', { name: 'Рассчитать стресс-сценарий' })).toBeDisabled()
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true')
  })
  it('отменяет запрос при смене сдвига и игнорирует поздний ответ', async () => {
    let resolve!: (value: typeof result) => void
    vi.mocked(calculateStress).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    render(<StressScenario calculation={calculation} />)
    fireEvent.click(screen.getByRole('button', { name: 'Рассчитать стресс-сценарий' }))
    const signal = vi.mocked(calculateStress).mock.calls[0][2]!
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '50' } })
    expect(signal.aborted).toBe(true)
    await act(async () => resolve(result))
    expect(screen.queryByText(/Изменение стоимости при/)).not.toBeInTheDocument()
  })
  it('показывает понятную ошибку и позволяет повторить', async () => {
    vi.mocked(calculateStress).mockRejectedValueOnce(
      new ApiError(404, 'calculation_not_found', 'not found'),
    )
    render(<StressScenario calculation={calculation} />)
    fireEvent.click(screen.getByRole('button', { name: 'Рассчитать стресс-сценарий' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Рассчитайте риск заново')
    fireEvent.click(screen.getByRole('button', { name: 'Рассчитать стресс-сценарий' }))
    await waitFor(() => expect(screen.getByText(/Изменение стоимости при/)).toBeInTheDocument())
  })
  it('отменяет запрос при удалении блока исходного расчёта', () => {
    vi.mocked(calculateStress).mockReturnValueOnce(new Promise(() => {}))
    const view = render(<StressScenario calculation={calculation} />)
    fireEvent.click(screen.getByRole('button', { name: 'Рассчитать стресс-сценарий' }))
    const signal = vi.mocked(calculateStress).mock.calls[0][2]!
    view.unmount()
    expect(signal.aborted).toBe(true)
  })
})
