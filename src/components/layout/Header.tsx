interface HeaderProps {
  count?: number
  onOpenBasket?: () => void
  onOpenHome?: () => void
}

function Header({ count = 0, onOpenBasket, onOpenHome }: HeaderProps) {
  return (
    <header className="site-header">
      {onOpenHome ? (
        <button
          type="button"
          className="site-header__brand"
          onClick={onOpenHome}
          aria-label="На главную"
        >
          <img src="/iriski-logo.png" alt="ИрискИ" />
        </button>
      ) : (
        <span className="site-header__brand">
          <img src="/iriski-logo.png" alt="ИрискИ" />
        </span>
      )}
      {onOpenBasket ? (
        <span className="site-header__title">Расчёт рисков</span>
      ) : (
        <h1 className="site-header__title">Корзина</h1>
      )}
      {onOpenBasket ? (
        <button
          type="button"
          className="site-header__basket"
          aria-label={`Открыть корзину, ${count} сделок`}
          onClick={onOpenBasket}
        >
          <img src="/basket.svg" alt="" />
          <span>{count}</span>
        </button>
      ) : (
        <span className="site-header__basket" aria-hidden="true">
          <img src="/basket.svg" alt="" />
          <span>{count}</span>
        </span>
      )}
    </header>
  )
}

export default Header
