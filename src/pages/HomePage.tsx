import { useRef, useState } from 'react'
import Header from '../components/layout/Header'
import DealForm from '../components/deal/DealForm'
import InstrumentInfo from '../components/instrument/InstrumentInfo'
import RiskResult from '../components/risk/RiskResult'
import { getInstrumentDetails } from '../api/instruments'
import { calculateRisk } from '../api/riskCalculations'
import { ApiError } from '../api/client'
import type { Deal } from '../types/deal'
import type { InstrumentDetails } from '../types/instrument'
import type { RiskCalculationResponse } from '../types/risk'

type InstrumentState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; details: InstrumentDetails }
  | { status: 'not-found' }
  | { status: 'error' }

type CalculationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: RiskCalculationResponse }
  | { status: 'error'; message: string }

function HomePage() {
  const [instrumentState, setInstrumentState] = useState<InstrumentState>({
    status: 'idle',
  })

  const [calculationState, setCalculationState] = useState<CalculationState>({
    status: 'idle',
  })

  const instrumentRequestId = useRef(0)
  const calculationRequestId = useRef(0)

  function resetCalculation() {
    calculationRequestId.current += 1
    setCalculationState({ status: 'idle' })
  }

  function handleIsinChange() {
    instrumentRequestId.current += 1
    setInstrumentState({ status: 'idle' })
    resetCalculation()
  }

  function handleDealChange() {
    resetCalculation()
  }

  async function handleIsinBlur(isin: string) {
    const currentRequestId = ++instrumentRequestId.current

    setInstrumentState({ status: 'loading' })

    try {
      const details = await getInstrumentDetails(isin)

      if (currentRequestId !== instrumentRequestId.current) {
        return
      }

      if (details === null) {
        setInstrumentState({ status: 'not-found' })
      } else {
        setInstrumentState({ status: 'success', details })
      }
    } catch {
      if (currentRequestId !== instrumentRequestId.current) {
        return
      }

      setInstrumentState({ status: 'error' })
    }
  }

  async function handleCalculate(deal: Deal) {
    if (instrumentState.status !== 'success' || calculationState.status === 'loading') {
      return
    }

    const currentRequestId = ++calculationRequestId.current

    setCalculationState({ status: 'loading' })

    try {
      const result = await calculateRisk(deal)

      if (currentRequestId !== calculationRequestId.current) {
        return
      }

      setCalculationState({ status: 'success', result })
    } catch (error) {
      if (currentRequestId !== calculationRequestId.current) {
        return
      }

      if (error instanceof ApiError && error.code === 'INSUFFICIENT_MARKET_DATA') {
        setCalculationState({
          status: 'error',
          message: 'Недостаточно рыночных данных для расчёта риска.',
        })
      } else {
        setCalculationState({
          status: 'error',
          message: 'Не удалось рассчитать риск. Попробуйте ещё раз.',
        })
      }
    }
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
          isCalculating={calculationState.status === 'loading'}
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

        {calculationState.status === 'idle' && (
          <p>Заполните параметры сделки и выполните расчёт.</p>
        )}

        {calculationState.status === 'loading' && <p role="status">Выполняется расчёт риска...</p>}

        {calculationState.status === 'error' && <p role="alert">{calculationState.message}</p>}

        {calculationState.status === 'success' && <RiskResult result={calculationState.result} />}
      </main>
    </>
  )
}

export default HomePage
