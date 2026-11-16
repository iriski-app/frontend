import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Deal, DealSide } from '../../types/deal'
import { isValidIsin } from '../../utils/isin'
import { isValidQuantity, MAX_QUANTITY, normalizeQuantityInput } from '../../utils/quantity'

interface DealFormProps {
  onCalculate: (deal: Deal) => void
  onAdd?: (deal: Deal) => void
  onIsinChange: () => void
  onIsinBlur: (isin: string) => void
  onDealChange: () => void
  onValidityChange: (isValid: boolean) => void
  isInstrumentReady: boolean
  isInstrumentFound?: boolean
  isCalculating: boolean
}

function DealForm({
  onCalculate,
  onAdd,
  onIsinChange,
  onIsinBlur,
  onDealChange,
  onValidityChange,
  isInstrumentReady,
  isInstrumentFound = false,
  isCalculating,
}: DealFormProps) {
  const [savedDraft] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('iriski:home-draft:v1') ?? '{}') as {
        isin?: string
        side?: DealSide
        quantity?: string
      }
    } catch {
      return {}
    }
  })
  const [isin, setIsin] = useState(savedDraft.isin ?? '')
  const [side, setSide] = useState<DealSide>(savedDraft.side === 'sell' ? 'sell' : 'buy')
  const [quantity, setQuantity] = useState(normalizeQuantityInput(savedDraft.quantity ?? ''))

  useEffect(() => {
    try {
      sessionStorage.setItem('iriski:home-draft:v1', JSON.stringify({ isin, side, quantity }))
    } catch {
      return
    }
  }, [isin, side, quantity])

  const [isinTouched, setIsinTouched] = useState(false)
  const [quantityTouched, setQuantityTouched] = useState(false)

  const normalizedIsin = isin.trim().toUpperCase()
  const parsedQuantity = Number(quantity)

  const validIsin = isValidIsin(normalizedIsin)
  const validQuantity = isValidQuantity(quantity)

  const canCalculate = validIsin && validQuantity && isInstrumentReady && !isCalculating

  useEffect(() => {
    onValidityChange(canCalculate)
  }, [canCalculate, onValidityChange])

  function handleIsinChange(value: string) {
    setIsin(value.toUpperCase())
    onIsinChange()
  }

  function handleIsinBlur() {
    setIsinTouched(true)

    if (validIsin) {
      onIsinBlur(normalizedIsin)
    }
  }

  function handleSideChange(value: DealSide) {
    if (value === side) return

    setSide(value)
    onDealChange()
  }

  function handleQuantityChange(value: string) {
    if (value === '' || /^\d+$/.test(value)) {
      setQuantity(normalizeQuantityInput(value))
      onDealChange()
    }
  }

  function decreaseQuantity() {
    const current = Number(quantity)
    const next = Number.isSafeInteger(current) && current > 1 ? current - 1 : 1

    setQuantity(String(next))
    setQuantityTouched(true)
    onDealChange()
  }

  function increaseQuantity() {
    const current = Number(quantity)
    const next =
      Number.isSafeInteger(current) && current >= 1 ? Math.min(MAX_QUANTITY, current + 1) : 1

    setQuantity(String(next))
    setQuantityTouched(true)
    onDealChange()
  }

  function createDeal(requireReady: boolean): Deal | null {
    setIsinTouched(true)
    setQuantityTouched(true)
    if (!validIsin || !validQuantity || (requireReady && !canCalculate)) return null
    return { isin: normalizedIsin, side, quantity: parsedQuantity }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const deal = createDeal(true)
    if (deal) onCalculate(deal)
  }

  return (
    <form id="deal-form" className="deal-form" onSubmit={handleSubmit} noValidate>
      <h2>Параметры расчёта</h2>

      <p className="deal-form__description">
        Заполните параметры сделки, чтобы получить риск-метрики и информацию об облигации
      </p>

      <div className="deal-form__field">
        <div className="deal-form__input-row">
          <label htmlFor="deal-isin">ISIN:</label>

          <input
            id="deal-isin"
            name="isin"
            type="text"
            value={isin}
            placeholder="Введите ISIN"
            maxLength={12}
            autoComplete="off"
            aria-invalid={isinTouched && !validIsin}
            aria-describedby={isinTouched && !validIsin ? 'deal-isin-error' : 'deal-isin-hint'}
            onChange={(event) => handleIsinChange(event.target.value)}
            onBlur={handleIsinBlur}
          />
        </div>

        <p className="deal-form__hint" id="deal-isin-hint">
          Укажите ISIN инструмента (12 символов)
        </p>

        {isinTouched && !validIsin && (
          <p className="deal-form__error" id="deal-isin-error" role="alert">
            Введите корректный ISIN из 12 символов
          </p>
        )}
      </div>

      <div className="deal-form__field">
        <div className="deal-form__input-row deal-form__input-row--quantity">
          <label htmlFor="deal-quantity">Количество облигаций:</label>

          <div
            className={`deal-form__stepper ${
              quantityTouched && !validQuantity ? 'deal-form__stepper--invalid' : ''
            }`}
          >
            <button
              type="button"
              className="deal-form__stepper-button"
              aria-label="Уменьшить количество облигаций"
              disabled={quantity === '1'}
              onClick={decreaseQuantity}
            >
              −
            </button>

            <input
              id="deal-quantity"
              name="quantity"
              type="text"
              inputMode="numeric"
              value={quantity}
              placeholder="1"
              aria-invalid={quantityTouched && !validQuantity}
              aria-describedby={
                quantityTouched && !validQuantity ? 'deal-quantity-error' : 'deal-quantity-hint'
              }
              onChange={(event) => handleQuantityChange(event.target.value)}
              onBlur={() => setQuantityTouched(true)}
            />

            <button
              type="button"
              className="deal-form__stepper-button"
              aria-label="Увеличить количество облигаций"
              disabled={quantity === String(MAX_QUANTITY)}
              onClick={increaseQuantity}
            >
              +
            </button>
          </div>
        </div>

        <p className="deal-form__hint" id="deal-quantity-hint">
          Укажите количество облигаций в сделке, не более 1 000 000 000
        </p>

        {quantityTouched && !validQuantity && (
          <p className="deal-form__error" id="deal-quantity-error" role="alert">
            Укажите положительное целое количество облигаций
          </p>
        )}
      </div>

      <fieldset className="deal-form__field deal-form__side-field">
        <legend className="deal-form__side-title">Направление сделки</legend>

        <div className="deal-form__input-row deal-form__input-row--side">
          <span className="deal-form__inline-label" aria-hidden="true">
            Направление сделки:
          </span>

          <div
            className={`deal-form__segmented ${
              side === 'sell' ? 'deal-form__segmented--sell' : ''
            }`}
          >
            <span className="deal-form__segmented-indicator" aria-hidden="true" />

            <label className="deal-form__segment">
              <input
                type="radio"
                name="side"
                value="buy"
                checked={side === 'buy'}
                onChange={() => handleSideChange('buy')}
              />
              <span>Покупка</span>
            </label>

            <label className="deal-form__segment">
              <input
                type="radio"
                name="side"
                value="sell"
                checked={side === 'sell'}
                onChange={() => handleSideChange('sell')}
              />
              <span>Продажа</span>
            </label>
          </div>
        </div>

        <p className="deal-form__hint">Выберите покупку или продажу</p>
      </fieldset>
      {onAdd && (
        <button
          type="button"
          className="home-page__calculate-button"
          disabled={!validIsin || !validQuantity || !isInstrumentFound}
          onClick={() => {
            const deal = createDeal(false)
            if (deal) onAdd(deal)
          }}
        >
          Добавить в корзину
        </button>
      )}
    </form>
  )
}

export default DealForm
