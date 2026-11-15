import HomePage from './pages/HomePage'
import BasketPage from './pages/BasketPage'
import { useBasket } from './hooks/useBasket'
import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const basket = useBasket()
  const [page, setPage] = useState(() => (window.location.hash === '#basket' ? 'basket' : 'home'))

  useEffect(() => {
    const updatePage = () => setPage(window.location.hash === '#basket' ? 'basket' : 'home')
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  if (page === 'basket') {
    return (
      <BasketPage
        state={basket.state}
        onOpenHome={() => {
          window.location.hash = ''
        }}
        onAdd={basket.add}
        onEdit={basket.edit}
        onRefresh={basket.refreshInstrument}
        onRemove={basket.remove}
        onRestore={basket.restore}
        onClear={basket.clear}
        beginCalculation={basket.beginCalculation}
        finishCalculation={basket.finishCalculation}
      />
    )
  }

  return (
    <HomePage
      basketCount={basket.state.items.length}
      onOpenBasket={() => {
        window.location.hash = 'basket'
      }}
      onAdd={basket.add}
    />
  )
}

export default App
