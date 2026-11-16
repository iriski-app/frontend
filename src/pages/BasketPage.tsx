import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Header from '../components/layout/Header'
import { getInstrumentDetails } from '../api/instruments'
import { calculateRisk } from '../api/riskCalculations'
import type { BasketItem, BasketState } from '../types/basket'
import type { DealSide } from '../types/deal'
import type { InstrumentDetails } from '../types/instrument'
import { isReady, normalizeIsin } from '../utils/basket'
import { isValidIsin } from '../utils/isin'
import { isValidQuantity, MAX_QUANTITY, normalizeQuantityInput } from '../utils/quantity'

interface BasketPageProps {
  state: BasketState
  onOpenHome: () => void
  onAdd: (
    deal: { isin: string; side: DealSide; quantity: number },
    instrument: InstrumentDetails,
  ) => boolean
  onEdit: (id: string, change: { side: DealSide; quantity: number }) => void
  onRefresh: (id: string, instrument: InstrumentDetails) => void
  onRemove: (id: string) => { item: BasketItem; index: number } | null
  onRestore: (item: BasketItem, index: number) => void
  onClear: () => void
  beginCalculation: () => { version: number; items: BasketItem[] }
  applyFreshInstruments: (
    version: number,
    refreshed: Array<{ id: string; instrument: InstrumentDetails }>,
  ) => { version: number; items: BasketItem[] } | null
  finishCalculation: (
    version: number,
    ids: string[],
    result: Awaited<ReturnType<typeof calculateRisk>>,
  ) => boolean
}

const EDIT_REQUIRED_MESSAGE = 'Сохраните изменения или нажмите «Отмена»'

function money(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value)
}

function missingReason(item: BasketItem): string | null {
  if (!item.instrument.ready_for_calculation) {
    return `Недостаточно данных: ${item.instrument.missing_parameters.join(', ') || 'рыночные данные'}`
  }
  return null
}

function SidePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: DealSide
  onChange: (value: DealSide) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function closeOnOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="basket-side-picker" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="basket-side-picker__trigger"
        aria-label="Направление сделки"
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {value === 'buy' ? 'Покупка' : 'Продажа'}
        <span aria-hidden="true" className="basket-side-picker__arrow" />
      </button>
      {open && (
        <div id={id} className="basket-side-picker__menu">
          {(['buy', 'sell'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={
                option === value
                  ? 'basket-side-picker__option basket-side-picker__option--selected'
                  : 'basket-side-picker__option'
              }
              aria-pressed={option === value}
              onClick={() => {
                onChange(option)
                setOpen(false)
                trigger.current?.focus()
              }}
            >
              {option === 'buy' ? 'Покупка' : 'Продажа'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BasketCard({
  item,
  onEdit,
  onRefresh,
  onDelete,
  editing,
  editingOther,
  editWarning,
  onEditingChange,
}: {
  item: BasketItem
  onEdit: BasketPageProps['onEdit']
  onRefresh: BasketPageProps['onRefresh']
  onDelete: () => void
  editing: boolean
  editingOther: boolean
  editWarning: boolean
  onEditingChange: (editing: boolean) => void
}) {
  const [side, setSide] = useState<DealSide>(item.deal.side)
  const [quantity, setQuantity] = useState(String(item.deal.quantity))
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const details = item.instrument
  const reason = missingReason(item)

  function cancel() {
    setSide(item.deal.side)
    setQuantity(String(item.deal.quantity))
    onEditingChange(false)
  }

  function save() {
    if (!isValidQuantity(quantity)) return
    onEdit(item.id, { side, quantity: Number(quantity) })
    onEditingChange(false)
  }

  async function refresh() {
    setRefreshing(true)
    setRefreshError('')
    try {
      const updated = await getInstrumentDetails(item.deal.isin)
      if (!updated) throw new Error('instrument_not_found')
      onRefresh(item.id, updated)
    } catch {
      setRefreshError('Не удалось обновить данные бумаги')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <article className="basket-card" aria-label={details.name}>
      <div className="basket-card__top">
        <div className="basket-card__heading">
          <h2>{details.name}</h2>
          <button
            type="button"
            className="basket-card__edit-button"
            aria-label={`Редактировать ${details.name}`}
            onClick={() => onEditingChange(true)}
            disabled={editing || editingOther}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path
                d="m4 20 4.5-1 10.7-10.7a2 2 0 0 0-2.8-2.8L5.7 16.2 4 20Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="m14.8 6.8 2.8 2.8" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
        <span>{item.deal.isin}</span>
      </div>
      <button
        type="button"
        className="basket-card__delete-button"
        aria-label={`Удалить ${details.name}`}
        onClick={onDelete}
      >
        <img src="/trash.svg" alt="" />
      </button>
      <dl className="basket-card__details">
        <div>
          <dt>Эмитент</dt>
          <dd>{details.issuer_name || 'Нет данных'}</dd>
        </div>
        <div>
          <dt>Цена бумаги</dt>
          <dd>
            {details.price_clean === null
              ? 'Нет данных'
              : `${money(details.price_clean)} ${details.currency ?? ''}`}
          </dd>
        </div>
        <div>
          <dt>Тип бумаги</dt>
          <dd>{details.instrument_type || 'Нет данных'}</dd>
        </div>
        <div>
          <dt>Дата погашения</dt>
          <dd>{details.maturity_date || 'Нет данных'}</dd>
        </div>
        <div>
          <dt>Источник рыночных данных</dt>
          <dd>{details.source || 'Нет данных'}</dd>
        </div>
        <div>
          <dt>Дата торгов</dt>
          <dd>{details.trade_date || 'Нет данных'}</dd>
        </div>
        <div>
          <dt>Валюта</dt>
          <dd>{details.currency || 'Нет данных'}</dd>
        </div>
        <div>
          <dt>Номинал</dt>
          <dd>
            {details.face_value === null
              ? 'Нет данных'
              : `${money(details.face_value)} ${details.currency ?? ''}`}
          </dd>
        </div>
        <div>
          <dt>Тип купона</dt>
          <dd>{details.coupon_type || 'Нет данных'}</dd>
        </div>
        <div>
          <dt>Частота купона</dt>
          <dd>{details.coupon_freq === null ? 'Нет данных' : money(details.coupon_freq)}</dd>
        </div>
        <div>
          <dt>Купонная ставка</dt>
          <dd>{details.coupon_rate === null ? 'Нет данных' : money(details.coupon_rate)}</dd>
        </div>
        <div>
          <dt>Тип цены</dt>
          <dd>{details.price_type || 'Нет данных'}</dd>
        </div>
        <div>
          <dt>Накопленный купонный доход</dt>
          <dd>{details.accrued_int === null ? 'Нет данных' : money(details.accrued_int)}</dd>
        </div>
        <div>
          <dt>Модифицированная дюрация</dt>
          <dd>{details.duration_mod === null ? 'Нет данных' : money(details.duration_mod)}</dd>
        </div>
        <div>
          <dt>Выпуклость</dt>
          <dd>{details.convexity === null ? 'Нет данных' : money(details.convexity)}</dd>
        </div>
        <div>
          <dt>Доходность к погашению</dt>
          <dd>{details.ytm === null ? 'Нет данных' : money(details.ytm)}</dd>
        </div>
        <div>
          <dt>Данные загружены</dt>
          <dd>
            {details.loaded_at ? new Date(details.loaded_at).toLocaleString('ru-RU') : 'Нет данных'}
          </dd>
        </div>
      </dl>
      <button
        type="button"
        className={`basket-card__refresh ${refreshing ? 'basket-card__refresh--loading' : ''}`}
        onClick={refresh}
        disabled={refreshing}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 11a8 8 0 1 0-2.4 6.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M20 5v6h-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{refreshing ? 'Обновляем…' : 'Обновить данные'}</span>
      </button>
      {refreshError && <p role="alert">{refreshError}</p>}
      <div className="basket-card__trade-row">
        {editing ? (
          <div className="basket-card__edit">
            <div className="basket-form__field">
              <label htmlFor={`quantity-${item.id}`}>Количество бумаг</label>
              <div className="deal-form__stepper">
                <button
                  type="button"
                  className="deal-form__stepper-button"
                  aria-label={`Уменьшить количество для ${details.name}`}
                  disabled={quantity === '1'}
                  onClick={() => setQuantity(String(Math.max(1, Number(quantity) - 1 || 1)))}
                >
                  −
                </button>
                <input
                  id={`quantity-${item.id}`}
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) => {
                    if (/^\d*$/.test(event.target.value))
                      setQuantity(normalizeQuantityInput(event.target.value))
                  }}
                  aria-invalid={!isValidQuantity(quantity)}
                />
                <button
                  type="button"
                  className="deal-form__stepper-button"
                  aria-label={`Увеличить количество для ${details.name}`}
                  disabled={quantity === String(MAX_QUANTITY)}
                  onClick={() =>
                    setQuantity(String(Math.min(MAX_QUANTITY, Number(quantity) + 1 || 1)))
                  }
                >
                  +
                </button>
              </div>
            </div>
            <div className="basket-form__field">
              <span className="basket-form__label">Направление:</span>
              <SidePicker value={side} onChange={setSide} />
            </div>
            <div className="basket-card__edit-actions">
              <button type="button" onClick={save} disabled={!isValidQuantity(quantity)}>
                Сохранить
              </button>
              <button type="button" onClick={cancel}>
                Отмена
              </button>
            </div>
            {!isValidQuantity(quantity) && (
              <p className="basket-form__error" role="alert">
                Укажите положительное целое число
              </p>
            )}
          </div>
        ) : (
          <p className="basket-card__deal">
            {item.deal.side === 'buy' ? 'Покупка' : 'Продажа'} · {item.deal.quantity} бумаг
          </p>
        )}
        {!reason && item.positionResult?.dv01 != null && (
          <p
            className={`basket-card__result ${item.positionResult.dv01 < 0 ? 'basket-card__result--negative' : ''}`}
          >
            Результат: {item.positionResult.dv01 >= 0 ? '+' : ''}
            {money(item.positionResult.dv01)} ₽/bp
            {item.positionResult.market_date &&
              item.positionResult.market_date.slice(0, 10) !== details.trade_date?.slice(0, 10) && (
                <small className="basket-card__result-date">
                  Расчёт по данным от {item.positionResult.market_date}
                </small>
              )}
          </p>
        )}
      </div>
      {reason && (
        <p className="basket-card__warning" role="status">
          {reason}
        </p>
      )}
      {editWarning && (
        <p className="basket-card__edit-warning" role="alert">
          {EDIT_REQUIRED_MESSAGE}
        </p>
      )}
    </article>
  )
}

function BasketPage({
  state,
  onOpenHome,
  onAdd,
  onEdit,
  onRefresh,
  onRemove,
  onRestore,
  onClear,
  beginCalculation,
  applyFreshInstruments,
  finishCalculation,
}: BasketPageProps) {
  const [isin, setIsin] = useState('')
  const [side, setSide] = useState<DealSide>('buy')
  const [quantity, setQuantity] = useState('1')
  const [searchIsin, setSearchIsin] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [calculationError, setCalculationError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Array<{ item: BasketItem; index: number }>>([])
  const [confirmClear, setConfirmClear] = useState(false)
  const cancelClearRef = useRef<HTMLButtonElement>(null)
  const confirmClearRef = useRef<HTMLButtonElement>(null)
  const calculationRun = useRef(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const ready = state.items.filter(isReady)
  const visibleItems = state.items.filter((item) =>
    item.deal.isin.includes(searchIsin.trim().toUpperCase()),
  )

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer)
    },
    [],
  )

  useEffect(() => {
    if (!confirmClear) return
    cancelClearRef.current?.focus()
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setConfirmClear(false)
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === cancelClearRef.current) {
          event.preventDefault()
          confirmClearRef.current?.focus()
        } else if (!event.shiftKey && document.activeElement === confirmClearRef.current) {
          event.preventDefault()
          cancelClearRef.current?.focus()
        }
      }
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [confirmClear])

  function clearBasket() {
    calculationRun.current += 1
    setCalculating(false)
    for (const timer of timers.current.values()) clearTimeout(timer)
    timers.current.clear()
    setRemoved([])
    setSearchIsin('')
    setEditingId(null)
    setCalculationError('')
    onClear()
    setConfirmClear(false)
  }

  async function add(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeIsin(isin)
    if (!isValidIsin(normalized)) {
      setAddError('Введите корректный ISIN')
      return
    }
    if (!isValidQuantity(quantity)) {
      setAddError('Укажите положительное целое количество бумаг')
      return
    }
    if (state.items.some((item) => item.deal.isin === normalized)) {
      setAddError('Бумага с таким ISIN уже есть в корзине')
      return
    }
    setAdding(true)
    setAddError('')
    try {
      const instrument = await getInstrumentDetails(normalized)
      if (!instrument) {
        setAddError('Бумага не найдена')
        return
      }
      if (!onAdd({ isin: normalized, side, quantity: Number(quantity) }, instrument)) {
        setAddError('Бумага с таким ISIN уже есть в корзине')
        return
      }
      setIsin('')
      setQuantity('1')
      setSearchIsin('')
    } catch {
      setAddError('Не удалось загрузить бумагу. Повторите попытку')
    } finally {
      setAdding(false)
    }
  }

  function remove(id: string) {
    if (editingId === id) setEditingId(null)
    const entry = onRemove(id)
    if (!entry) return
    setRemoved((current) => [...current, entry])
    const timer = setTimeout(() => {
      setRemoved((current) => current.filter((value) => value.item.id !== id))
      timers.current.delete(id)
    }, 5000)
    timers.current.set(id, timer)
  }

  function undo(entry: { item: BasketItem; index: number }) {
    clearTimeout(timers.current.get(entry.item.id))
    timers.current.delete(entry.item.id)
    onRestore(entry.item, entry.index)
    setRemoved((current) => current.filter((value) => value.item.id !== entry.item.id))
  }

  function dismissRemoved(id: string) {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setRemoved((current) => current.filter((value) => value.item.id !== id))
  }

  async function calculate() {
    if (editingId) {
      setSearchIsin('')
      setCalculationError(EDIT_REQUIRED_MESSAGE)
      return
    }
    if (state.items.length === 0) return
    const snapshot = beginCalculation()
    const run = ++calculationRun.current
    let stage: 'refresh' | 'calculate' = 'refresh'
    setCalculating(true)
    setCalculationError('')
    try {
      const refreshed = await Promise.all(
        snapshot.items.map(async (item) => {
          const instrument = await getInstrumentDetails(item.deal.isin)
          if (!instrument) throw new Error('instrument_not_found')
          return { id: item.id, instrument }
        }),
      )
      if (run !== calculationRun.current) return
      const current = applyFreshInstruments(snapshot.version, refreshed)
      if (!current) {
        setCalculationError(
          'Корзина изменилась во время обновления данных. Запустите расчёт ещё раз',
        )
        return
      }
      const readyItems = current.items.filter(isReady)
      if (readyItems.length === 0) {
        setCalculationError('После обновления данных нет бумаг, готовых к расчёту')
        return
      }
      const ids = readyItems.map((item) => item.id)
      stage = 'calculate'
      const result = await calculateRisk(readyItems.map((item) => item.deal))
      if (run !== calculationRun.current) return
      if (!finishCalculation(current.version, ids, result)) {
        setCalculationError('Корзина изменилась во время расчёта. Запустите его ещё раз')
      } else {
        requestAnimationFrame(() => {
          if (run !== calculationRun.current) return
          resultRef.current?.scrollIntoView?.({
            behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
            block: 'start',
          })
        })
      }
    } catch {
      if (run !== calculationRun.current) return
      setCalculationError(
        stage === 'refresh'
          ? 'Не удалось обновить данные всех бумаг. Расчёт не выполнен'
          : 'Не удалось рассчитать риск. Повторите попытку',
      )
    } finally {
      if (run === calculationRun.current) setCalculating(false)
    }
  }

  return (
    <>
      <Header count={state.items.length} onOpenHome={onOpenHome} />
      <main className="basket-page">
        {import.meta.env.VITE_USE_MOCK_API === 'true' && (
          <p className="basket-page__notice" role="status">
            Демонстрационный режим: показаны тестовые данные и расчёты
          </p>
        )}
        <div className="basket-page__count-row">
          <p className="basket-page__count">Количество сделок в корзине: {state.items.length}</p>
          {state.items.length > 0 && (
            <button
              type="button"
              className="basket-page__clear"
              onClick={() => setConfirmClear(true)}
            >
              Очистить корзину
            </button>
          )}
        </div>
        {confirmClear && (
          <div className="basket-page__dialog-backdrop">
            <div
              className="basket-page__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="clear-basket-title"
              aria-describedby="clear-basket-description"
            >
              <h2 id="clear-basket-title">Очистить корзину?</h2>
              <p id="clear-basket-description">Все сделки и результат расчёта будут удалены</p>
              <div className="basket-page__dialog-actions">
                <button ref={cancelClearRef} type="button" onClick={() => setConfirmClear(false)}>
                  Отмена
                </button>
                <button ref={confirmClearRef} type="button" onClick={clearBasket}>
                  Очистить
                </button>
              </div>
            </div>
          </div>
        )}
        {state.items.length > 0 && (
          <div className={`basket-page__search ${searchOpen ? 'basket-page__search--open' : ''}`}>
            <button
              type="button"
              className="basket-page__search-toggle"
              aria-label="Открыть поиск по ISIN"
              aria-expanded={searchOpen}
              onClick={() => {
                setSearchOpen(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                requestAnimationFrame(() => searchInputRef.current?.focus({ preventScroll: true }))
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="2" />
                <path
                  d="m16 16 4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <input
              ref={searchInputRef}
              type="search"
              value={searchIsin}
              onChange={(event) => setSearchIsin(event.target.value.toUpperCase())}
              placeholder="Поиск по ISIN в корзине"
              aria-label="Поиск по ISIN в корзине"
              tabIndex={searchOpen ? 0 : -1}
            />
            {searchOpen && (
              <button
                type="button"
                className="basket-page__search-close"
                aria-label="Закрыть поиск"
                onClick={() => {
                  setSearchOpen(false)
                  setSearchIsin('')
                }}
              >
                ×
              </button>
            )}
          </div>
        )}
        <form className="basket-add" onSubmit={add} noValidate>
          <h2>Добавить бумагу</h2>
          <div className="basket-form__field">
            <label htmlFor="basket-isin">ISIN</label>
            <input
              id="basket-isin"
              value={isin}
              disabled={adding}
              onChange={(event) => {
                setIsin(event.target.value.toUpperCase())
                setAddError('')
              }}
              maxLength={12}
              placeholder="RU000A100006"
            />
          </div>
          <div className="basket-form__field">
            <span className="basket-form__label">Направление</span>
            <SidePicker value={side} onChange={setSide} disabled={adding} />
          </div>
          <div className="basket-form__field">
            <label htmlFor="basket-quantity">Количество бумаг</label>
            <div className="deal-form__stepper">
              <button
                type="button"
                className="deal-form__stepper-button"
                aria-label="Уменьшить количество бумаг"
                disabled={adding || quantity === '1'}
                onClick={() => setQuantity(String(Math.max(1, Number(quantity) - 1 || 1)))}
              >
                −
              </button>
              <input
                id="basket-quantity"
                inputMode="numeric"
                value={quantity}
                disabled={adding}
                onChange={(event) => {
                  if (/^\d*$/.test(event.target.value))
                    setQuantity(normalizeQuantityInput(event.target.value))
                }}
              />
              <button
                type="button"
                className="deal-form__stepper-button"
                aria-label="Увеличить количество бумаг"
                disabled={adding || quantity === String(MAX_QUANTITY)}
                onClick={() =>
                  setQuantity(String(Math.min(MAX_QUANTITY, Number(quantity) + 1 || 1)))
                }
              >
                +
              </button>
            </div>
          </div>
          <button type="submit" disabled={adding}>
            {adding ? 'Загрузка...' : 'Добавить'}
          </button>
          {addError && (
            <p className="basket-form__error" role="alert">
              {addError}
            </p>
          )}
        </form>
        {state.items.length === 0 ? (
          <p>Корзина пуста. Добавьте бумагу для расчёта</p>
        ) : visibleItems.length === 0 ? (
          <p className="basket-page__no-results">Совпадений не найдено</p>
        ) : (
          <div className="basket-page__list">
            {visibleItems.map((item) => (
              <BasketCard
                key={item.id}
                item={item}
                onEdit={onEdit}
                onRefresh={onRefresh}
                onDelete={() => remove(item.id)}
                editing={editingId === item.id}
                editingOther={editingId !== null && editingId !== item.id}
                editWarning={editingId === item.id && calculationError === EDIT_REQUIRED_MESSAGE}
                onEditingChange={(editing) => {
                  setEditingId(editing ? item.id : null)
                  setCalculationError('')
                }}
              />
            ))}
          </div>
        )}
        {removed.length > 0 && (
          <div className="basket-page__undo-stack" aria-live="polite">
            {removed.map((entry) => (
              <div key={entry.item.id} className="basket-page__undo" role="status">
                <span>{entry.item.instrument.name} удалена из корзины</span>
                <button type="button" onClick={() => undo(entry)}>
                  Вернуть
                </button>
                <button
                  type="button"
                  className="basket-page__undo-close"
                  aria-label={`Закрыть уведомление об удалении ${entry.item.instrument.name}`}
                  onClick={() => dismissRemoved(entry.item.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {state.items.length > 0 && ready.length < state.items.length && (
          <p className="basket-page__notice">
            К расчёту готовы {ready.length} из {state.items.length} позиций. Остальные не войдут в
            итог
          </p>
        )}
        <div className="basket-page__summary">
          {state.total && (
            <div className="basket-page__total" ref={resultRef}>
              <p>
                Итог: {state.total.value >= 0 ? '+' : ''}
                {money(state.total.value)} ₽/bp
              </p>
              <small>
                Сохранённый расчёт · Рассчитано {state.total.included} из {state.total.total}{' '}
                позиций · {new Date(state.total.calculatedAt).toLocaleString('ru-RU')}
              </small>
            </div>
          )}
          {calculationError && calculationError !== EDIT_REQUIRED_MESSAGE && (
            <p role="alert">{calculationError}</p>
          )}
          {state.total && (
            <section
              className="basket-page__explanation"
              aria-labelledby="basket-explanation-title"
            >
              <h2 id="basket-explanation-title">Объяснение результата</h2>
              <p>Здесь появится объяснение риск-метрики от LLM</p>
            </section>
          )}
          <button
            type="button"
            className="basket-page__calculate-button"
            aria-label={calculating ? 'Обновление и расчёт...' : 'Рассчитать'}
            onClick={calculate}
            disabled={state.items.length === 0 || calculating}
          >
            <span>{calculating ? 'Обновление и расчёт...' : 'Рассчитать'}</span>
            {!calculating && <small aria-hidden="true">Данные бумаг обновятся автоматически</small>}
          </button>
        </div>
      </main>
    </>
  )
}

export default BasketPage
