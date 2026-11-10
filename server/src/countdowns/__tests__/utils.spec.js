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

const titlesUk = [
  'ігри',
  'три монети в фонтані',
  'overwatch 2',
  'ігри на моїй хаті',
  'вечірка через забор',
  'blade runner 2049',
  '28 днів потому',
  '55 днів в пекінгу',
  'дивитися через 46 хвилин',
  'дивитися через 1:46г',
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

const intervalsUk = [
  ['через 5', { interval: { minutes: 5 } }],
  ['через 1:15', { interval: { hours: 1, minutes: 15 } }],
  ['через 1:30г', { interval: { hours: 1, minutes: 30 } }],
  ['через 1.5год', { interval: { hours: 1, minutes: 30 } }],
  ['через 2г.', { interval: { hours: 2 } }],
  ['через 2 годин та 15 хвилин', { interval: { hours: 2, minutes: 15 } }],
  ['через 3д, 12г', { interval: { days: 3, hours: 12 } }],
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

const datesUk = [
  ['на 31.12.2026 UTC', { date: { year: 2026, month: 12, day: 31 }, timezone: 'UTC' }],
  ['31.12.2026', { date: { year: 2026, month: 12, day: 31 } }],
  ['на 31.12.26', { date: { year: 2026, month: 12, day: 31 } }],
  ['2026.12.31 EET', { date: { year: 2026, month: 12, day: 31 }, timezone: 'EET' }],
  ['на 2026-12-31', { date: { year: 2026, month: 12, day: 31 } }],
  ['31.12 CEST', { date: { month: 12, day: 31 }, timezone: 'CEST' }],
  ['на 31.12', { date: { month: 12, day: 31 } }],
]

const timesEn = [
  ['at 9:00', { time: { hours: 9, minutes: 0 } }],
  ['9:00 UTC', { time: { hours: 9, minutes: 0 }, timezone: 'UTC' }],
  ['at 12:30', { time: { hours: 12, minutes: 30 } }],
  ['12:30 EET', { time: { hours: 12, minutes: 30 }, timezone: 'EET' }],
  ['at 9', { time: { hours: 9 } }],
  ['at 21 CEST', { time: { hours: 21 }, timezone: 'CEST' }],
]

const timesUk = [
  ['в 9:00', { time: { hours: 9, minutes: 0 } }],
  ['9:00 UTC', { time: { hours: 9, minutes: 0 }, timezone: 'UTC' }],
  ['о 12:30', { time: { hours: 12, minutes: 30 } }],
  ['12:30 EET', { time: { hours: 12, minutes: 30 }, timezone: 'EET' }],
  ['на 9', { time: { hours: 9 } }],
  ['в 21 CEST', { time: { hours: 21 }, timezone: 'CEST' }],
]

// NOTE: timezone next to time wins over timezone next to date
const datetimesEn = [
  ...datesEn.flatMap(([date, dateExpected]) => {
    return timesEn.map(([time, timeExpected]) => {
      return [`${date} ${time}`, { ...dateExpected, ...timeExpected }]
    })
  }),
  ...timesEn.flatMap(([date, timeExpected]) => {
    return datesEn.map(([time, dateExpected]) => {
      return [`${date} ${time}`, { ...dateExpected, ...timeExpected }]
    })
  }),
]

const datetimesUk = [
  ...datesUk.flatMap(([date, dateExpected]) => {
    return timesUk.map(([time, timeExpected]) => {
      return [`${date} ${time}`, { ...dateExpected, ...timeExpected }]
    })
  }),
  ...timesUk.flatMap(([date, timeExpected]) => {
    return datesUk.map(([time, dateExpected]) => {
      return [`${date} ${time}`, { ...dateExpected, ...timeExpected }]
    })
  }),
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

    it.each(
      titlesEn.flatMap(title => {
        return datetimesEn.map(([datetime, expected]) => {
          return [`${title} ${datetime}`, { title, ...expected }]
        })
      }),
    )('handles dates with times (en): %s', (input, expected) => {
      expect(parseCountdown(input)).toEqual(expected)
    })

    // ---

    it.each(
      titlesUk.flatMap(title => {
        return intervalsUk.map(([interval, expected]) => {
          return [`${title} ${interval}`, { title, ...expected }]
        })
      }),
    )('handles intervals (uk): %s', (input, expected) => {
      expect(parseCountdown(input)).toEqual(expected)
    })

    it.each(
      titlesUk.flatMap(title => {
        return datesUk.map(([date, expected]) => {
          return [`${title} ${date}`, { title, ...expected }]
        })
      }),
    )('handles dates (uk): %s', (input, expected) => {
      expect(parseCountdown(input)).toEqual(expected)
    })

    it.each(
      titlesUk.flatMap(title => {
        return timesUk.map(([time, expected]) => {
          return [`${title} ${time}`, { title, ...expected }]
        })
      }),
    )('handles times (uk): %s', (input, expected) => {
      expect(parseCountdown(input)).toEqual(expected)
    })

    it.each(
      titlesUk.flatMap(title => {
        return datetimesUk.map(([datetime, expected]) => {
          return [`${title} ${datetime}`, { title, ...expected }]
        })
      }),
    )('handles dates with times (uk): %s', (input, expected) => {
      expect(parseCountdown(input)).toEqual(expected)
    })
  })
})
