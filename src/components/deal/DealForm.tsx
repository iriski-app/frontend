import DealSideSelector from './DealSideSelector'

function DealForm() {
  return (
    <form>
      <h2>Параметры сделки</h2>

      <label htmlFor="isin">ISIN облигации</label>
      <input id="isin" name="isin" type="text" placeholder="Введите ISIN" />

      <DealSideSelector />

      <label htmlFor="quantity">Количество облигаций</label>
      <input
        id="quantity"
        name="quantity"
        type="number"
        min="1"
        step="1"
        placeholder="Введите количество"
      />

      <button type="button">Рассчитать риск</button>
    </form>
  )
}

export default DealForm
