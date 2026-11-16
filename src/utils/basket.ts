import type { BasketItem, BasketState } from '../types/basket'
import type { Deal } from '../types/deal'
import type { InstrumentDetails } from '../types/instrument'
import type { RiskCalculationResponse } from '../types/risk'
import { isValidIsin } from './isin'
import { isValidQuantity } from './quantity'
import { createLocalId } from './ids'

export const BASKET_STORAGE_KEY = 'iriski:basket:v1'

export const emptyBasket: BasketState = { items: [], total: null }

export function normalizeIsin(isin: string): string {
  return isin.trim().toUpperCase()
}

export function isDuplicate(items: BasketItem[], isin: string): boolean {
  return items.some((item) => item.deal.isin === normalizeIsin(isin))
}

export function isReady(item: BasketItem): boolean {
  return item.instrument.ready_for_calculation
}

export function addItem(
  state: BasketState,
  deal: Deal,
  instrument: InstrumentDetails,
): BasketState {
  const isin = normalizeIsin(deal.isin)
  if (isDuplicate(state.items, isin)) return state
  return {
    items: [
      ...state.items,
      { id: createLocalId(), deal: { ...deal, isin }, instrument, positionResult: null },
    ],
    total: null,
  }
}

export function editItem(
  state: BasketState,
  id: string,
  change: Pick<Deal, 'side' | 'quantity'>,
): BasketState {
  return {
    items: state.items.map((item) =>
      item.id === id ? { ...item, deal: { ...item.deal, ...change }, positionResult: null } : item,
    ),
    total: null,
  }
}

export function removeItem(state: BasketState, id: string): BasketState {
  return { items: state.items.filter((item) => item.id !== id), total: null }
}

export function restoreItem(state: BasketState, item: BasketItem, index: number): BasketState {
  if (isDuplicate(state.items, item.deal.isin)) return state
  const items = [...state.items]
  items.splice(Math.min(index, items.length), 0, { ...item, positionResult: null })
  return { items, total: null }
}

export function applyCalculation(
  state: BasketState,
  includedIds: string[],
  response: RiskCalculationResponse,
): BasketState {
  const included = state.items.filter((item) => includedIds.includes(item.id))
  if (
    response.status !== 'success' ||
    response.positions.length !== included.length ||
    response.total_dv01_rub === null
  ) {
    throw new Error('Ответ расчёта не соответствует корзине')
  }
  const positions = new Map(
    response.positions.map((position) => [position.instrument_id, position]),
  )
  if (positions.size !== included.length)
    throw new Error('Ответ расчёта содержит повторные инструменты')
  for (const item of included) {
    const result = positions.get(item.instrument.id)
    if (
      !result ||
      result.dv01 === null ||
      result.side !== item.deal.side ||
      result.quantity !== item.deal.quantity
    ) {
      throw new Error('Ответ расчёта не соответствует позициям корзины')
    }
  }
  return {
    items: state.items.map((item) => ({
      ...item,
      positionResult: includedIds.includes(item.id) ? positions.get(item.instrument.id)! : null,
    })),
    total: {
      value: response.total_dv01_rub,
      calculationId: response.id,
      asOfDate: response.as_of_date,
      calculatedAt: new Date().toISOString(),
      included: included.length,
      total: state.items.length,
    },
  }
}

export function readBasket(): BasketState {
  try {
    const value = sessionStorage.getItem(BASKET_STORAGE_KEY)
    if (!value) return emptyBasket
    const parsed: unknown = JSON.parse(value)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('items' in parsed) ||
      !Array.isArray(parsed.items)
    ) {
      return emptyBasket
    }
    const items: BasketItem[] = []
    const seen = new Set<string>()
    for (const item of parsed.items) {
      if (!item || typeof item !== 'object') continue
      const deal = item.deal as Deal | undefined
      const instrument = item.instrument as InstrumentDetails | undefined
      const isin = typeof deal?.isin === 'string' ? normalizeIsin(deal.isin) : ''
      if (
        typeof item.id !== 'string' ||
        !isValidIsin(isin) ||
        seen.has(isin) ||
        !instrument ||
        instrument.isin !== isin ||
        typeof instrument.id !== 'string' ||
        (deal?.side !== 'buy' && deal?.side !== 'sell') ||
        !isValidQuantity(String(deal.quantity))
      )
        continue
      seen.add(isin)
      items.push({ ...item, deal: { ...deal, isin } } as BasketItem)
    }
    const possibleTotal =
      'total' in parsed ? (parsed.total as Partial<NonNullable<BasketState['total']>> | null) : null
    const total =
      possibleTotal &&
      typeof possibleTotal.value === 'number' &&
      possibleTotal.total === items.length &&
      typeof possibleTotal.calculatedAt === 'string'
        ? (possibleTotal as BasketState['total'])
        : null
    return { items, total }
  } catch {
    return emptyBasket
  }
}
