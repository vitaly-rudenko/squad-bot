import { env } from '../env.js'

/**
 * @param {import('./types.js').Photo} photo
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

  return extractAmounts(parsedText)
}

const AMOUNT_SEARCH_REGEX = /(\b| |^)(([\dззiobs]{1,2} )[\dззiobs]{3,}([\.,][\dззiobs]+)?|[\dзiobs,\.:+x]+)(\b| |$)/g
const AMOUNT_VALIDATION_REGEX = /^\d+(\.\d{2})?$/
const WHITESPACE_LIKE_REGEX = /[ \f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/g

/** @param {string} text */
export function extractAmounts(text) {
  text = text.toLowerCase().replaceAll(WHITESPACE_LIKE_REGEX, ' ')

  const matches = text.match(AMOUNT_SEARCH_REGEX)
  if (!matches) return []

  const currentYear = String(new Date().getFullYear())

  return matches
    .map(match => match
      .trim()
      .replaceAll(',', '.')
      .replaceAll('з', '3')
      .replaceAll('з', '3')
      .replaceAll('i', '1')
      .replaceAll('o', '0')
      .replaceAll('s', '5')
      .replaceAll('b', '6')
      .replaceAll('x', ''))
    .flatMap(number => number.includes(' ') ? [number.replaceAll(' ', ''), ...number.split(' ')] : [number])
    .filter(number => AMOUNT_VALIDATION_REGEX.test(number) && (!number.startsWith('0') || number.startsWith('0.')) && number !== currentYear)
    .flatMap(number => !number.includes('.') && number.length >= 5 ? [number, `${number.slice(0, -2)}.${number.slice(-2)}`] : [number]) // 79900 => 799.00 & 79900.00
    .sort((a, b) => scoreRawAmount(b) - scoreRawAmount(a))
    .map(Number)
    .filter(amount => Number.isFinite(amount) && amount > 0 && amount <= 100_000)
    .sort((a, b) => scoreParsedAmount(b) - scoreParsedAmount(a))
    .map(amount => amountToCoins(amount))
    .filter((value, index, self) => self.indexOf(value) === index)
}

/** @param {string} amount */
function scoreRawAmount(amount) {
  return amount.includes('.') ? 1 : 0
}

/** @param {number} amount */
function scoreParsedAmount(amount) {
  return amount >= 10 && amount <= 1000 ? 1 : 0
}

/** @param {number} number */
function amountToCoins(number) {
  return Number((number * 100).toFixed(0))
}
