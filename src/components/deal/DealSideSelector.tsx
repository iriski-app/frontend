function DealSideSelector() {
  return (
    <fieldset>
      <legend>Тип сделки</legend>

      <label>
        <input type="radio" name="side" value="buy" defaultChecked />
        Покупка
      </label>

      <label>
        <input type="radio" name="side" value="sell" />
        Продажа
      </label>
    </fieldset>
  )
}

export default DealSideSelector
