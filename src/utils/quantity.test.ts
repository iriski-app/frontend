import { describe, expect, it } from 'vitest'
import { isValidQuantity } from './quantity'

describe('isValidQuantity', () => {
  it('принимает положительные целые числа', () => {
    expect(isValidQuantity('1')).toBe(true)
    expect(isValidQuantity('10')).toBe(true)
    expect(isValidQuantity('1000')).toBe(true)
  })

  it('принимает число с пробелами по краям', () => {
    expect(isValidQuantity('  10  ')).toBe(true)
  })

  it('отклоняет пустую строку', () => {
    expect(isValidQuantity('')).toBe(false)
    expect(isValidQuantity('   ')).toBe(false)
  })

  it('отклоняет ноль', () => {
    expect(isValidQuantity('0')).toBe(false)
  })

  it('отклоняет отрицательные числа', () => {
    expect(isValidQuantity('-5')).toBe(false)
  })

  it('отклоняет дробные числа', () => {
    expect(isValidQuantity('1.5')).toBe(false)
    expect(isValidQuantity('2,5')).toBe(false)
  })

  it('отклоняет нечисловые символы', () => {
    expect(isValidQuantity('abc')).toBe(false)
    expect(isValidQuantity('10abc')).toBe(false)
  })

  it('отклоняет экспоненциальную запись', () => {
    expect(isValidQuantity('1e3')).toBe(false)
  })

  it('отклоняет числа больше Number.MAX_SAFE_INTEGER', () => {
    expect(isValidQuantity('9007199254740992')).toBe(false)
  })

  it('принимает максимальное безопасное целое число', () => {
    expect(isValidQuantity('9007199254740991')).toBe(true)
  })
})
