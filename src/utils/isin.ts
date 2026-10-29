export function isValidIsin(value: string): boolean {
  const isin = value.trim().toUpperCase()

  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) {
    return false
  }

  let digits = ''

  for (const character of isin) {
    if (character >= 'A' && character <= 'Z') {
      digits += String(character.charCodeAt(0) - 55)
    } else {
      digits += character
    }
  }

  let sum = 0
  let shouldDouble = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i])

    if (shouldDouble) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }
    sum += digit
    shouldDouble = !shouldDouble
  }

  return sum % 10 === 0
}
