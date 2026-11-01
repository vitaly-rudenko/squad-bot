import { parseCountdown } from '../utils'

const titlesEn = [
  'games',
  'three coins in the fountain',
  'overwatch 2',
  'games at my house',
  'party on the roof',
  'blade runner 2049',
  '28 days later',
  '55 days at peking',
  'watch in 46 minutes',
  'watch in 1:46h',
]

const intervalsEn = [
  ['in 5', { interval: { minutes: 5 } }],
  ['in 1:15', { interval: { hours: 1, minutes: 15 } }],
  ['in 1:30h', { interval: { hours: 1, minutes: 30 } }],
  ['in 1.5h', { interval: { hours: 1, minutes: 30 } }],
  ['in 2hr.', { interval: { hours: 2 } }],
  ['in 2 hours and 15 minutes', { interval: { hours: 2, minutes: 15 } }],
  ['in 3d, 12h', { interval: { days: 3, hours: 12 } }],
]

// TODO: support month names? (e.g. "November")
// TODO: support natural numbers? (e.g. "31st")
const datesEn = [
  ['on 31.12.2026 UTC', { date: { year: 2026, month: 12, day: 31 }, timezone: 'UTC' }],
  ['31.12.2026', { date: { year: 2026, month: 12, day: 31 } }],
  ['on 31.12.26', { date: { year: 2026, month: 12, day: 31 } }],
  ['2026.12.31 EET', { date: { year: 2026, month: 12, day: 31 }, timezone: 'EET' }],
  ['on 2026-12-31', { date: { year: 2026, month: 12, day: 31 } }],
  ['31.12 CEST', { date: { month: 12, day: 31 }, timezone: 'CEST' }],
  ['on 31.12', { date: { month: 12, day: 31 } }],
]

const timesEn = [
  ['at 9:00', { time: { hours: 9, minutes: 0 } }],
  ['9:00 UTC', { time: { hours: 9, minutes: 0 }, timezone: 'UTC' }],
  ['at 12:30', { time: { hours: 12, minutes: 30 } }],
  ['12:30 EET', { time: { hours: 12, minutes: 30 }, timezone: 'EET' }],
  ['at 9', { time: { hours: 9 } }],
  ['9 CET', { time: { hours: 9 }, timezone: 'CET' }],
  ['at 21', { time: { hours: 21 } }],
  ['21 CEST', { time: { hours: 21 }, timezone: 'CEST' }],
]

const datetimesEn = [
  // TODO:
]

describe('utils', () => {
  describe('parseCountdown()', () => {
    it.each(
      titlesEn.flatMap(title => {
        return intervalsEn.map(([interval, expected]) => {
          return [`${title} ${interval}`, { title, ...expected }]
        })
      }),
    )('handles intervals (en): %s', (input, expected) => {
      expect(parseCountdown(input)).toEqual(expected)
    })

    it.each(
      titlesEn.flatMap(title => {
        return datesEn.map(([date, expected]) => {
          return [`${title} ${date}`, { title, ...expected }]
        })
      }),
    )('handles dates (en): %s', (input, expected) => {
      expect(parseCountdown(input)).toEqual(expected)
    })

    it.each(
      titlesEn.flatMap(title => {
        return timesEn.map(([time, expected]) => {
          return [`${title} ${time}`, { title, ...expected }]
        })
      }),
    )('handles times (en): %s', (input, expected) => {
      expect(parseCountdown(input)).toEqual(expected)
    })

    // TODO: Ukrainian tests
  })
})
