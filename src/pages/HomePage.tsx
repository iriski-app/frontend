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

  const [canSubmitDeal, setCanSubmitDeal] = useState(false)

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
    resetCalculation()

    try {
      const details = await getInstrumentDetails(isin)

      if (currentRequestId !== instrumentRequestId.current) {
        return
      }

      if (details === null) {
        setInstrumentState({ status: 'not-found' })
      } else {
        setInstrumentState({
          status: 'success',
          details,
        })
      }
    } catch {
      if (currentRequestId !== instrumentRequestId.current) {
        return
      }

      setInstrumentState({ status: 'error' })
    }
  }

  async function handleCalculate(deal: Deal) {
    if (
      instrumentState.status !== 'success' ||
      !instrumentState.details.ready_for_calculation ||
      calculationState.status === 'loading'
    ) {
      return
    }

    const currentRequestId = ++calculationRequestId.current

    setCalculationState({ status: 'loading' })

    try {
      const result = await calculateRisk(deal)

      if (currentRequestId !== calculationRequestId.current) {
        return
      }

      setCalculationState({
        status: 'success',
        result,
      })
    } catch (error) {
      if (currentRequestId !== calculationRequestId.current) {
        return
      }

      let message = 'Не удалось рассчитать риск. Попробуйте ещё раз.'

      if (error instanceof ApiError) {
        switch (error.code) {
          case 'missing_parameter':
            message = 'Отсутствуют необходимые параметры для расчёта риска.'
            break

          case 'missing_duration':
            message = 'Отсутствует модифицированная дюрация облигации.'
            break

          case 'calculation_data_not_found':
            message = 'Не найдены рыночные данные для расчёта риска по сделке.'
            break
        }
      }

      setCalculationState({
        status: 'error',
        message,
      })
    }
  }

  const isInstrumentReady =
    instrumentState.status === 'success' && instrumentState.details.ready_for_calculation

  return (
    <>
      <Header />

      <main
        className={`home-page ${calculationState.status === 'success' ? 'home-page--result' : ''}`}
      >
        <h1 className="home-page__title">Расчёт финансовых рисков</h1>

        <div className="home-page__layout">
          <section
            className="home-page__panel home-page__panel--deal"
            aria-label="Параметры сделки и информация об облигации"
          >
            <DealForm
              onCalculate={handleCalculate}
              onIsinChange={handleIsinChange}
              onIsinBlur={handleIsinBlur}
              onDealChange={handleDealChange}
              onValidityChange={setCanSubmitDeal}
              isInstrumentReady={isInstrumentReady}
              isCalculating={calculationState.status === 'loading'}
            />

            {instrumentState.status === 'loading' && (
              <p role="status">Загрузка данных облигации...</p>
            )}

            {instrumentState.status === 'not-found' && (
              <p role="status">Облигация с таким ISIN не найдена.</p>
            )}

            {instrumentState.status === 'error' && (
              <p role="alert">Не удалось загрузить данные облигации. Попробуйте ещё раз.</p>
            )}

            {instrumentState.status === 'success' && (
              <InstrumentInfo details={instrumentState.details} />
            )}

            <div className="home-page__deal-actions">
              <button
                className="home-page__calculate-button"
                type="submit"
                form="deal-form"
                disabled={!canSubmitDeal || !isInstrumentReady}
              >
                {calculationState.status === 'loading' ? 'Расчёт...' : 'Рассчитать риск'}
              </button>
            </div>
          </section>

          <section
            className="home-page__panel home-page__panel--risk"
            aria-label="Область расчёта риска"
          >
            {calculationState.status === 'idle' && (
              <>
                <h2>Результаты расчёта</h2>
                <p>Заполните параметры сделки и выполните расчёт.</p>
              </>
            )}

            {calculationState.status === 'loading' && (
              <p role="status">Выполняется расчёт риска...</p>
            )}

            {calculationState.status === 'error' && (
              <>
                <h2>Ошибка расчёта</h2>
                <p role="alert">{calculationState.message}</p>
              </>
            )}

            {calculationState.status === 'success' && (
              <RiskResult result={calculationState.result} />
            )}
          </section>
        </div>
      </main>
    </>
  )
}

export default HomePage
