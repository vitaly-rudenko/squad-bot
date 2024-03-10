import { readFileSync } from 'fs'
import { env } from '../../env.js'

/**
 * @param {import('../types').Photo} photo
 * @returns {Promise<import('../types').ScanResult[] | undefined>}
 */
async function scan(photo) {
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

  const scanResults = (parsedText.match(/\b[\d\.,:]+\b/g) ?? [])
    .map(number => number.replaceAll(',', '.'))
    .map(number => ({ amount: Math.trunc(Number(number) * 100), score: scoreAmount(number) }))
    .filter(({amount}) => Number.isSafeInteger(amount) && amount > 0 && amount < 100_000_00)
    .filter(({score}) => score >= 0)
    .reduce((acc, curr) => {
      const existing = acc.find(({amount}) => amount === curr.amount)
      if (existing) {
        existing.score++
        return acc
      }

      return [...acc, curr]
    }, /** @type {import('../types').ScanResult[]} */ ([]))
    .sort((a, b) => b.score - a.score)

  return scanResults
}

/** @param {string} amount */
function scoreAmount(amount) {
  let score = 0

  if (amount.includes('.')) score += 1
  if (amount.length === 6) score += 1
  if (amount.length > 2 && amount.length <= 7) score += 1

  if (amount.indexOf('.') !== amount.lastIndexOf('.')) score -= 1
  if (amount.startsWith('20') && amount.length === 4 && !amount.includes('.')) score -= 1
  if (amount.startsWith('0')) score -= 1
  if (amount.length < 2) score -= 1
  if (amount === String(new Date().getFullYear())) score -= 1
  if (amount.includes(':')) score -= 1

  return score
}

const buffer = readFileSync('/Users/vitaly/Desktop/IMG_1841-min.jpeg')

scan({
  buffer,
  mimetype: 'image/jpeg',
}).then(console.log)
