import { describe, expect, it } from 'vitest'
import { isValidQuantity, MAX_QUANTITY, normalizeQuantityInput } from './quantity'

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

  it('отклоняет количество выше установленного максимума', () => {
    expect(isValidQuantity(String(MAX_QUANTITY + 1))).toBe(false)
    expect(isValidQuantity('10000000000000000000000000000')).toBe(false)
  })

  it('принимает установленный максимум', () => {
    expect(isValidQuantity(String(MAX_QUANTITY))).toBe(true)
  })
})

describe('normalizeQuantityInput', () => {
  it('убирает ведущие нули и ограничивает очень большое число', () => {
    expect(normalizeQuantityInput('0005')).toBe('5')
    expect(normalizeQuantityInput('10000000000000000000000000000')).toBe(String(MAX_QUANTITY))
  })
})
