import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockInstruments } from '../mocks/instruments'
import type { BasketState } from '../types/basket'
import {
  addItem,
  applyCalculation,
  editItem,
  emptyBasket,
  isDuplicate,
  readBasket,
  removeItem,
  restoreItem,
  BASKET_STORAGE_KEY,
} from './basket'

const first = mockInstruments.RU000A100006
const second = mockInstruments.RU000A0JX0J2

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn().mockReturnValueOnce('one').mockReturnValueOnce('two'),
  })
})

describe('корзина', () => {
  it('не допускает повторный ISIN после нормализации', () => {
    const state = addItem(emptyBasket, { isin: 'ru000a100006', side: 'buy', quantity: 2 }, first)
    expect(isDuplicate(state.items, ' RU000A100006 ')).toBe(true)
    expect(addItem(state, { isin: 'RU000A100006', side: 'sell', quantity: 5 }, first)).toBe(state)
  })

  it('при изменении или удалении убирает общий итог и результат изменённой позиции', () => {
    const state = addItem(emptyBasket, { isin: first.isin, side: 'buy', quantity: 2 }, first)
    const calculated: BasketState = {
      ...state,
      items: [
        {
          ...state.items[0],
          positionResult: {
            id: 'result',
            instrument_id: first.id,
            side: 'buy',
            quantity: 2,
            market_value: 100,
            duration_mod: 1,
            dv01: -1,
            source: 'moex',
            market_date: null,
          },
        },
      ],
      total: {
        value: -1,
        calculationId: 'calc',
        asOfDate: '2026-11-15',
        calculatedAt: '2026-11-15',
        included: 1,
        total: 1,
      },
    }
    const edited = editItem(calculated, state.items[0].id, { side: 'sell', quantity: 3 })
    expect(edited.total).toBeNull()
    expect(edited.items[0].positionResult).toBeNull()
    expect(edited.items[0].deal.isin).toBe(first.isin)
    expect(removeItem(calculated, state.items[0].id).total).toBeNull()
  })

  it('привязывает результаты к инструментам независимо от порядка ответа', () => {
    let state = addItem(emptyBasket, { isin: first.isin, side: 'buy', quantity: 2 }, first)
    state = addItem(state, { isin: second.isin, side: 'sell', quantity: 3 }, second)
    const response = {
      id: 'calc',
      status: 'success',
      as_of_date: '2026-11-15',
      total_dv01_rub: 2,
      positions: [
        {
          id: 'r2',
          instrument_id: second.id,
          side: 'sell' as const,
          quantity: 3,
          market_value: 100,
          duration_mod: 1,
          dv01: 3,
          source: 'moex',
          market_date: null,
        },
        {
          id: 'r1',
          instrument_id: first.id,
          side: 'buy' as const,
          quantity: 2,
          market_value: 100,
          duration_mod: 1,
          dv01: -1,
          source: 'moex',
          market_date: null,
        },
      ],
    }
    const calculated = applyCalculation(
      state,
      state.items.map((item) => item.id),
      response,
    )
    expect(calculated.items.map((item) => item.positionResult?.dv01)).toEqual([-1, 3])
    expect(calculated.total?.included).toBe(2)
    expect(() =>
      applyCalculation(
        state,
        state.items.map((item) => item.id),
        { ...response, positions: [response.positions[0]] },
      ),
    ).toThrow()
  })

  it('восстанавливает удалённую позицию и сохранённые данные после перезагрузки', () => {
    const state = addItem(emptyBasket, { isin: first.isin, side: 'buy', quantity: 2 }, first)
    const restored = restoreItem(removeItem(state, state.items[0].id), state.items[0], 0)
    expect(restored.items).toHaveLength(1)
    sessionStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(restored))
    expect(readBasket().items[0].instrument.name).toBe(first.name)
  })
})
