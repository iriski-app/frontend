import { describe, expect, it } from 'vitest'
import { isValidIsin } from './isin'

describe('isValidIsin', () => {
  it('принимает корректный ISIN', () => {
    expect(isValidIsin('US0378331005')).toBe(true)
    expect(isValidIsin('GB0002634946')).toBe(true)
  })

  it('принимает ISIN в нижнем регистре', () => {
    expect(isValidIsin('us0378331005')).toBe(true)
  })

  it('игнорирует пробелы по краям строки', () => {
    expect(isValidIsin('  US0378331005  ')).toBe(true)
  })

  it('отклоняет пустую строку', () => {
    expect(isValidIsin('')).toBe(false)
    expect(isValidIsin('   ')).toBe(false)
  })

  it('отклоняет ISIN неправильной длины', () => {
    expect(isValidIsin('US037833100')).toBe(false)
    expect(isValidIsin('US03783310055')).toBe(false)
  })

  it('отклоняет ISIN без двух букв в начале', () => {
    expect(isValidIsin('120378331005')).toBe(false)
  })

  it('отклоняет недопустимые символы', () => {
    expect(isValidIsin('US03783310@5')).toBe(false)
    expect(isValidIsin('US0378331 05')).toBe(false)
  })

  it('отклоняет неверную контрольную цифру', () => {
    expect(isValidIsin('US0378331006')).toBe(false)
  })
})
