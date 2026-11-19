import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import RiskExplanation from './RiskExplanation'
import { getExplanation } from '../../api/explanations'

vi.mock('../../api/explanations', async (original) => ({
  ...(await original<typeof import('../../api/explanations')>()),
  getExplanation: vi.fn(),
}))
beforeEach(() => sessionStorage.clear())

it('показывает подписи фактов и сохраняет ограничения объяснения', async () => {
  vi.mocked(getExplanation).mockResolvedValue({
    calculationId: 'calc',
    text: 'Объяснение',
    sources: ['total_rub', 'position:private-id:value_rub'],
    mode: 'verified',
    calculationDetailsAvailable: false,
    limitations: ['Ограничение объяснения'],
  })
  const view = render(
    <RiskExplanation
      calculationId="calc"
      totalDv01Rub={-2}
      positionLabels={{ 'private-id': 'RU000A100006' }}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Получить объяснение' }))
  expect(await screen.findByText('Итоговый DV01 в рублях')).toBeInTheDocument()
  expect(screen.getByText('DV01 в рублях · RU000A100006')).toBeInTheDocument()
  expect(screen.queryByText(/private-id/)).not.toBeInTheDocument()
  expect(screen.getByText(/подробный разбор формулы недоступен/)).toBeInTheDocument()
  view.unmount()
  render(<RiskExplanation calculationId="calc" totalDv01Rub={-2} />)
  expect(screen.getByText('Ограничение объяснения')).toBeInTheDocument()
  expect(getExplanation).toHaveBeenCalledTimes(1)
})
