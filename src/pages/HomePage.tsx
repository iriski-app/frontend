import Header from '../components/layout/Header'
import DealForm from '../components/deal/DealForm'
import RiskResult from '../components/risk/RiskResult'

function HomePage() {
  return (
    <>
      <Header />

      <main>
        <h1>Расчёт финансовых рисков</h1>

        <DealForm />
        <RiskResult />
      </main>
    </>
  )
}

export default HomePage
