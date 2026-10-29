import type { DealSide } from '../../types/deal'

interface DealSideSelectorProps {
  value: DealSide
  onChange: (side: DealSide) => void
}

function DealSideSelector({ value, onChange }: DealSideSelectorProps) {
  return (
    <fieldset className="deal-side-selector">
      <legend>Направление сделки</legend>

      <div className="deal-side-options">
        <label>
          <input
            type="radio"
            name="side"
            value="buy"
            checked={value === 'buy'}
            onChange={() => onChange('buy')}
          />
          Покупка
        </label>

        <label>
          <input
            type="radio"
            name="side"
            value="sell"
            checked={value === 'sell'}
            onChange={() => onChange('sell')}
          />
          Продажа
        </label>
      </div>
    </fieldset>
  )
}

export default DealSideSelector
