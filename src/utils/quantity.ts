export function isValidQuantity(value: string): boolean {
  const quantity = value.trim()
  const parsedQuantity = Number(quantity)

  return /^[0-9]+$/.test(quantity) && Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0
}
