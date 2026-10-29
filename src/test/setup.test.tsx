import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('React testing setup', () => {
  it('renders a React component', () => {
    render(<button type="button">Рассчитать риск</button>)

    const button = screen.getByRole('button', {
      name: 'Рассчитать риск',
    })

    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
  })
})
