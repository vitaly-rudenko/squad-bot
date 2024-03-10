import { readFileSync } from 'fs'
import { env } from '../../env.js'

/**
 * @param {import('../types').Photo} photo
 * @returns {Promise<number[] | undefined>}
 */
export async function scan(photo) {
  const form = new FormData()
  form.set('file', new Blob([photo.buffer], { type: photo.mimetype }), 'photo.jpg')
  form.set('detectOrientation', 'true')
  form.set('isTable', 'true')
  form.set('scale', 'true')
  form.set('OCREngine', '2')

  const response = await fetch(env.OCR_SPACE_ENDPOINT, {
    method: 'POST',
    headers: {
      Apikey: env.OCR_SPACE_API_KEY,
    },
    body: form,
  })

  /** @type {any} */
  const results = await response.json()

  /** @type {string} */
  const parsedText = results?.ParsedResults?.[0]?.ParsedText
  if (!parsedText) return undefined

  const amounts = (parsedText.match(/\b[\d\.,:]+\b/g) ?? [])
    .map(number => number.replaceAll(',', '.'))
    .filter(number => probablyAnAmount(number))
    .sort((a, b) => scoreAmount(b) - scoreAmount(a))
    .map(Number)
    .filter(amount => Number.isSafeInteger(amount) && amount > 0 && amount < 100_000)
    .map(amount => amountToCoins(amount))

  return [...new Set(amounts)]
}

/** @param {string} input */
function probablyAnAmount(input) {
  if (input.includes(':')) return false // time
  if (input === String(new Date().getFullYear())) return false // current year
  if (input.startsWith('0')) return false // part of date or time
  if (input.indexOf('.') !== input.lastIndexOf('.')) return false // date

  return true
}

/** @param {string} amount */
function scoreAmount(amount) {
  let score = 0

  if (amount.includes('.')) score += 1
  if (amount.length === 5 || amount.length === 6) score += 1
  if (amount.length >= 2 && amount.length <= 7) score += 1

  if (amount.startsWith('20') && amount.length === 4) score -= 1
  if (amount.length === 1) score -= 1

  return score
}

/** @param {number} number */
function amountToCoins(number) {
  return Number((number * 100).toFixed(0))
}

const buffer = readFileSync('/Users/vitaly/Desktop/IMG_1841-min.jpeg')

scan({
  buffer,
  mimetype: 'image/jpeg',
}).then(console.log)
