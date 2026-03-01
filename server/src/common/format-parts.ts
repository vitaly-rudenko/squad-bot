import { type Part } from './transcribe.ts'

export function formatParts(parts: Part[], partial = false) {
  let cumulative = '<b>0:00</b>'
  let startsAt = 0

  for (let part of parts) {
    if (part.startsAt - startsAt >= 60_000) {
      if (cumulative.endsWith('.')) {
        startsAt = part.startsAt

        const minutes = Math.floor(startsAt / 60_000)
        const seconds = String(Math.floor((startsAt - minutes * 60_000) / 1000)).padStart(2, '0')

        cumulative += `\n\n<b>${minutes}:${seconds}</b> ${part.text}`
      } else {
        if (part.text.endsWith('.')) {
          startsAt = part.startsAt

          const minutes = Math.floor(startsAt / 60_000)
          const seconds = String(Math.floor((startsAt - minutes * 60_000) / 1000)).padStart(2, '0')

          cumulative += ` ${part.text}\n\n<b>${minutes}:${seconds}</b> ${part.text}`
        } else if (part.text.includes('. ')) {
          startsAt = part.startsAt

          const minutes = Math.floor(startsAt / 60_000)
          const seconds = String(Math.floor((startsAt - minutes * 60_000) / 1000)).padStart(2, '0')

          const subParts = part.text.split('. ')
          const prefix = subParts[0].trim()
          const suffix = subParts.slice(1).join('. ').trim()

          cumulative += ` ${prefix}.\n\n<b>${minutes}:${seconds}</b> ${suffix}`
        } else {
          cumulative += ' ' + part.text
        }
      }
    } else {
      cumulative += ' ' + part.text
    }
  }

  if (partial) {
    cumulative = cumulative + (cumulative.endsWith('.') ? '..' : '...')
  }

  return cumulative
}
