export type DealSide = 'buy' | 'sell'
export interface Deal {
  isin: string
  side: DealSide
  quantity: number
}
