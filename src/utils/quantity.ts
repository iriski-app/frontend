export const MAX_QUANTITY = 1_000_000_000

export function isValidQuantity(value: string): boolean {
  const quantity = value.trim()
  const parsedQuantity = Number(quantity)

  return (
    /^[0-9]+$/.test(quantity) &&
    Number.isSafeInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= MAX_QUANTITY
  )
}

export function normalizeQuantityInput(value: string): string {
  const normalized = value.replace(/^0+(?=\d)/, '')
  if (!/^\d+$/.test(normalized)) return normalized

  const maximum = String(MAX_QUANTITY)
  return normalized.length > maximum.length ||
    (normalized.length === maximum.length && normalized > maximum)
    ? maximum
    : normalized
}
