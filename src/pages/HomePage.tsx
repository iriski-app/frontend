import Header from '../components/layout/Header'
import DealForm from '../components/deal/DealForm'
import RiskResult from '../components/risk/RiskResult'
import RiskExplanation from '../components/risk/RiskExplanation'

function HomePage() {
  return (
    <>
      <Header />

      <main>
        <h1>Расчёт финансовых рисков</h1>

        <DealForm />
        <RiskResult />
        <RiskExplanation />
      </main>
    </>
  )
}

export default HomePage
