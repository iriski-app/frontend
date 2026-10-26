export interface Instrument {
  isin: string
  name: string
  instrumentType: string | null
  issuerName: string | null
  currency: string
  faceValue: number

  couponType: string
  couponFreq: number | null
  couponRate: number | null
  maturityDate: string | null
}

export interface InstrumentMarketData {
  priceType: string
  priceClean: number | null
  accruedInt: number | null
  durationMod: number | null
  convexity: number | null
  ytm: number | null

  source: string
  tradeDate: string
  loadedAt: string
}

export interface InstrumentDetails {
  instrument: Instrument
  marketData: InstrumentMarketData | null
}
