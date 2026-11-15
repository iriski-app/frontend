import { useEffect, useRef, useState } from 'react'

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
  | { status: 'success'; result: RiskCalculationResponse; calculatedAt: string }
  | { status: 'error'; message: string }

interface HomePageProps {
  basketCount: number
  onOpenBasket: () => void
  onAdd: (deal: Deal, instrument: InstrumentDetails) => boolean
}

function readHomeState(): { instrument: InstrumentState; calculation: CalculationState } {
  try {
    const raw = sessionStorage.getItem('iriski:home:v1')
    if (raw) {
      const value = JSON.parse(raw)
      if (value?.instrument?.status && value?.calculation?.status) {
        const savedCalculation = value.calculation
        return {
          instrument: value.instrument.status === 'loading' ? { status: 'idle' } : value.instrument,
          calculation:
            savedCalculation.status === 'loading' ||
            (savedCalculation.status === 'success' &&
              typeof savedCalculation.calculatedAt !== 'string')
              ? { status: 'idle' }
              : savedCalculation,
        }
      }
    }
  } catch {
    return { instrument: { status: 'idle' }, calculation: { status: 'idle' } }
  }
  return { instrument: { status: 'idle' }, calculation: { status: 'idle' } }
}

function HomePage({ basketCount, onOpenBasket, onAdd }: HomePageProps) {
  const [saved] = useState(readHomeState)
  const [instrumentState, setInstrumentState] = useState<InstrumentState>(saved.instrument)

  const [calculationState, setCalculationState] = useState<CalculationState>(saved.calculation)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    try {
      sessionStorage.setItem(
        'iriski:home:v1',
        JSON.stringify({ instrument: instrumentState, calculation: calculationState }),
      )
    } catch {
      return
    }
  }, [instrumentState, calculationState])

  const [canSubmitDeal, setCanSubmitDeal] = useState(false)

  const instrumentRequestId = useRef(0)
  const calculationRequestId = useRef(0)

  function resetCalculation() {
    calculationRequestId.current += 1
    setCalculationState({ status: 'idle' })
  }

  function handleIsinChange() {
    setAddError('')
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
      const result = await calculateRisk([deal])

      if (currentRequestId !== calculationRequestId.current) {
        return
      }

      setCalculationState({
        status: 'success',
        result,
        calculatedAt: new Date().toISOString(),
      })
    } catch (error) {
      if (currentRequestId !== calculationRequestId.current) {
        return
      }

      let message = 'Не удалось рассчитать риск. Попробуйте ещё раз'

      if (error instanceof ApiError) {
        switch (error.code) {
          case 'missing_parameter':
            message = 'Отсутствуют необходимые параметры для расчёта риска'
            break

          case 'missing_duration':
            message = 'Отсутствует модифицированная дюрация облигации'
            break

          case 'calculation_data_not_found':
            message = 'Не найдены рыночные данные для расчёта риска по сделке'
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

  function handleAdd(deal: Deal) {
    if (instrumentState.status !== 'success') return
    if (onAdd(deal, instrumentState.details)) {
      setAddError('')
      onOpenBasket()
    } else {
      setAddError('Бумага с таким ISIN уже есть в корзине')
    }
  }

  return (
    <>
      <Header count={basketCount} onOpenBasket={onOpenBasket} />

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
              onAdd={handleAdd}
              onIsinChange={handleIsinChange}
              onIsinBlur={handleIsinBlur}
              onDealChange={handleDealChange}
              onValidityChange={setCanSubmitDeal}
              isInstrumentReady={isInstrumentReady}
              isInstrumentFound={instrumentState.status === 'success'}
              isCalculating={calculationState.status === 'loading'}
            />
            {addError && (
              <p className="deal-form__error" role="alert">
                {addError}
              </p>
            )}

            {instrumentState.status === 'loading' && (
              <p role="status">Загрузка данных облигации...</p>
            )}

            {instrumentState.status === 'not-found' && (
              <p role="status">Облигация с таким ISIN не найдена</p>
            )}

            {instrumentState.status === 'error' && (
              <p role="alert">Не удалось загрузить данные облигации. Попробуйте ещё раз</p>
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
                <p>Заполните параметры сделки и выполните расчёт</p>
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
              <>
                <RiskResult result={calculationState.result} />
                <p>
                  Сохранённый расчёт ·{' '}
                  {new Date(calculationState.calculatedAt).toLocaleString('ru-RU')}
                </p>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  )
}

export default HomePage
