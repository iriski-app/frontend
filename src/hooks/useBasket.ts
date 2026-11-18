import { useEffect, useRef, useState } from 'react'
import type { BasketItem, BasketState } from '../types/basket'
import type { Deal } from '../types/deal'
import type { InstrumentDetails } from '../types/instrument'
import type { RiskCalculationResponse } from '../types/risk'
import {
  BASKET_STORAGE_KEY,
  emptyBasket,
  addItem,
  applyCalculation,
  editItem,
  isDuplicate,
  readBasket,
  removeItem,
  restoreItem,
} from '../utils/basket'

export function useBasket() {
  const [state, setState] = useState<BasketState>(readBasket)
  const stateRef = useRef(state)
  const version = useRef(0)

  useEffect(() => {
    try {
      sessionStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(state))
    } catch {
      return
    }
  }, [state])

  function update(next: BasketState) {
    stateRef.current = next
    setState(next)
    version.current += 1
  }

  function add(deal: Deal, instrument: InstrumentDetails): boolean {
    if (isDuplicate(stateRef.current.items, deal.isin)) return false
    update(addItem(stateRef.current, deal, instrument))
    return true
  }

  function edit(id: string, change: Pick<Deal, 'side' | 'quantity'>) {
    update(editItem(stateRef.current, id, change))
  }

  function refreshInstrument(id: string, instrument: InstrumentDetails) {
    const item = stateRef.current.items.find((value) => value.id === id)
    if (!item || item.deal.isin !== instrument.isin) return
    update({
      items: stateRef.current.items.map((value) =>
        value.id === id ? { ...value, instrument, positionResult: null } : value,
      ),
      total: null,
    })
  }

  function remove(id: string): { item: BasketItem; index: number } | null {
    const index = stateRef.current.items.findIndex((item) => item.id === id)
    if (index < 0) return null
    const item = stateRef.current.items[index]
    update(removeItem(stateRef.current, id))
    return { item, index }
  }

  function restore(item: BasketItem, index: number) {
    update(restoreItem(stateRef.current, item, index))
  }

  function clear() {
    update(emptyBasket)
  }

  function beginCalculation(): { version: number; items: BasketItem[] } {
    const items = stateRef.current.items.map((item) => ({ ...item, positionResult: null }))
    update({ items, total: null })
    return { version: version.current, items }
  }

  function applyFreshInstruments(
    snapshotVersion: number,
    refreshed: Array<{ id: string; instrument: InstrumentDetails }>,
  ): { version: number; items: BasketItem[] } | null {
    if (snapshotVersion !== version.current) return null
    const byId = new Map(refreshed.map(({ id, instrument }) => [id, instrument]))
    if (byId.size !== stateRef.current.items.length) return null
    for (const item of stateRef.current.items) {
      if (byId.get(item.id)?.isin !== item.deal.isin) return null
    }
    const items = stateRef.current.items.map((item) => ({
      ...item,
      instrument: byId.get(item.id)!,
      positionResult: null,
    }))
    update({ items, total: null })
    return { version: version.current, items }
  }

  function finishCalculation(
    snapshotVersion: number,
    ids: string[],
    result: RiskCalculationResponse,
  ): boolean {
    if (snapshotVersion !== version.current) return false
    update(applyCalculation(stateRef.current, ids, result))
    return true
  }

  return {
    state,
    add,
    edit,
    refreshInstrument,
    remove,
    restore,
    clear,
    beginCalculation,
    applyFreshInstruments,
    finishCalculation,
  }
}
