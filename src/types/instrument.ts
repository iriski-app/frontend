export interface InstrumentDetails {
  isin: string
  name: string
  instrument_type: string | null
  issuer_name: string | null
  currency: string | null
  face_value: number | null

  coupon_type: string | null
  coupon_freq: number | null
  coupon_rate: number | null
  maturity_date: string | null

  price_type: string | null
  price_clean: number | null
  accrued_int: number | null
  duration_mod: number | null
  convexity: number | null
  ytm: number | null
  source: string | null
  trade_date: string | null
  loaded_at: string | null

  ready_for_calculation: boolean
  missing_parameters: string[]
}
