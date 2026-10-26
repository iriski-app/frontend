import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import type { Deal, DealSide } from '../../types/deal'
import { isValidIsin } from '../../utils/isin'
import { isValidQuantity } from '../../utils/quantity'
import DealSideSelector from './DealSideSelector'

interface DealFormProps {
  onCalculate: (deal: Deal) => void
  onIsinChange: () => void
  onIsinBlur: (isin: string) => void
  onDealChange: () => void
  isInstrumentFound: boolean
}

interface TouchedFields {
  isin: boolean
  quantity: boolean
}

function DealForm({
  onCalculate,
  onIsinChange,
  onIsinBlur,
  onDealChange,
  isInstrumentFound,
}: DealFormProps) {
  const [isin, setIsin] = useState('')
  const [side, setSide] = useState<DealSide>('buy')
  const [quantity, setQuantity] = useState('')

  const [touched, setTouched] = useState<TouchedFields>({
    isin: false,
    quantity: false,
  })

  const normalizedIsin = isin.trim().toUpperCase()
  const normalizedQuantity = quantity.trim()
  const parsedQuantity = Number(normalizedQuantity)
  const validIsin = isValidIsin(normalizedIsin)
  const validQuantity = isValidQuantity(quantity)

  const canCalculate = validIsin && validQuantity && isInstrumentFound

  const isinError = !touched.isin
    ? undefined
    : normalizedIsin === ''
      ? 'Обязательное поле. Введите ISIN'
      : !validIsin
        ? 'Некорректный ISIN. Проверьте введённое значение'
        : undefined

  const quantityError = !touched.quantity
    ? undefined
    : normalizedQuantity === ''
      ? 'Введите количество облигаций'
      : !validQuantity
        ? 'Введите положительное целое число'
        : undefined

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canCalculate) {
      return
    }

    const deal: Deal = {
      isin: normalizedIsin,
      side,
      quantity: parsedQuantity,
    }

    onCalculate(deal)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>Параметры сделки</h2>

      <label htmlFor="isin">ISIN облигации</label>
      <input
        id="isin"
        name="isin"
        type="text"
        placeholder="Введите ISIN"
        value={isin}
        required
        aria-invalid={Boolean(isinError)}
        aria-describedby={isinError ? 'isin-error' : undefined}
        onChange={(event) => {
          setIsin(event.target.value.toUpperCase())
          onIsinChange()
        }}
        onBlur={() => {
          setIsin(normalizedIsin)
          setTouched((previous) => ({ ...previous, isin: true }))

          if (validIsin) {
            onIsinBlur(normalizedIsin)
          }
        }}
      />
      {isinError && (
        <p id="isin-error" role="alert">
          {isinError}
        </p>
      )}

      <DealSideSelector
        value={side}
        onChange={(newSide) => {
          setSide(newSide)
          onDealChange()
        }}
      />

      <label htmlFor="quantity">Количество облигаций</label>
      <input
        id="quantity"
        name="quantity"
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        placeholder="Введите количество"
        value={quantity}
        required
        aria-invalid={Boolean(quantityError)}
        aria-describedby={quantityError ? 'quantity-error' : undefined}
        onChange={(event) => {
          setQuantity(event.target.value)
          onDealChange()
        }}
        onBlur={() => setTouched((previous) => ({ ...previous, quantity: true }))}
      />
      {quantityError && (
        <p id="quantity-error" role="alert">
          {quantityError}
        </p>
      )}
      <section>
        <button type="submit" disabled={!canCalculate}>
          Рассчитать риск
        </button>
      </section>
    </form>
  )
}

export default DealForm
