import { useRef, useState } from 'react'
import Header from '../components/layout/Header'
import DealForm from '../components/deal/DealForm'
import InstrumentInfo from '../components/instrument/InstrumentInfo'
import RiskResult from '../components/risk/RiskResult'
import { getInstrumentDetails } from '../api/instruments'
import type { Deal } from '../types/deal'
import type { InstrumentDetails } from '../types/instrument'

type InstrumentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; details: InstrumentDetails }
  | { status: 'not-found' }
  | { status: 'error' }

function HomePage() {
  const [submittedDeal, setSubmittedDeal] = useState<Deal | null>(null)

  const [instrumentState, setInstrumentState] = useState<InstrumentState>({
    status: 'idle',
  })

  const requestId = useRef(0)

  function handleIsinChange() {
    requestId.current += 1
    setInstrumentState({ status: 'idle' })
    setSubmittedDeal(null)
  }

  async function handleIsinBlur(isin: string) {
    const currentRequestId = ++requestId.current

    setInstrumentState({ status: 'loading' })

    try {
      const details = await getInstrumentDetails(isin)

      if (currentRequestId !== requestId.current) {
        return
      }

      if (details === null) {
        setInstrumentState({ status: 'not-found' })
      } else {
        setInstrumentState({ status: 'success', details })
      }
    } catch {
      if (currentRequestId !== requestId.current) {
        return
      }

      setInstrumentState({ status: 'error' })
    }
  }

  function handleCalculate(deal: Deal) {
    setSubmittedDeal(deal)
  }
  function handleDealChange() {
    setSubmittedDeal(null)
  }

  return (
    <>
      <Header />

      <main>
        <h1>Расчёт финансовых рисков</h1>

        <DealForm
          onCalculate={handleCalculate}
          onIsinChange={handleIsinChange}
          onIsinBlur={handleIsinBlur}
          onDealChange={handleDealChange}
          isInstrumentFound={instrumentState.status === 'success'}
        />

        {instrumentState.status === 'loading' && <p role="status">Загрузка данных облигации...</p>}

        {instrumentState.status === 'not-found' && (
          <p role="status">Облигация с таким ISIN не найдена.</p>
        )}

        {instrumentState.status === 'error' && (
          <p role="alert">Не удалось загрузить данные облигации. Попробуйте ещё раз.</p>
        )}

        {instrumentState.status === 'success' && (
          <InstrumentInfo details={instrumentState.details} />
        )}

        {submittedDeal && (
          <p>
            Параметры сделки приняты: {submittedDeal.isin}, количество: {submittedDeal.quantity},
            направление: {submittedDeal.side === 'buy' ? 'Покупка' : 'Продажа'}. Расчёт риска пока
            не подключён.
          </p>
        )}

        <RiskResult />
      </main>
    </>
  )
}

export default HomePage
