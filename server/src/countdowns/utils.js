// Intervals

const intervalDays = '(?<days>\\d{1,2}) ?(days?|d\\.?|день|дні|днів|дн\\.?|д\\.?)'
const intervalHours = '(?<hours>\\d{1,2}) ?(hours?|hrs?\\.?|h\\.?|година|години|годин|годину|год\\.?|г\\.?)'
const intervalHoursWithMinutes =
  '(?<hours>\\d{1,2}):(?<minutes>\\d{2}) ?(hours?|hrs?\\.?|h\\.?|година|години|годин|годину|год\\.?|г\\.?)'
const intervalMinutes = '(?<minutes>\\d{1,2}) ?(minutes?|mins?\\.?|m\\.?|хвилина|хвилини|хвилин|хвилину|хв\\.?|х\\.?)'
const intervalQuick = '((?<hours>\\d{1,2}):)?(?<minutes>\\d{1,2})'
const intervalDecimal = '(?<hours>\\d{1,2}\\.\\d{1}) ?(hours?|hrs?\\.?|h\\.?|година|години|годин|годину|год\\.?|г\\.?)'

const intervals = [
  //
  [intervalDays, intervalHoursWithMinutes],
  [intervalDays, intervalHours, intervalMinutes],
  [intervalDays, intervalHours],
  [intervalDays],
  [intervalHoursWithMinutes],
  [intervalHours, intervalMinutes],
  [intervalHours],
  [intervalMinutes],
  [intervalQuick],
  [intervalDecimal],
]

const intervalRegexes = intervals.map(parts => new RegExp(` (in|через) ${parts.join('( | (and|та|і) |, ?)')}$`, 'i'))

// Absolute dates

const dateDayMonthYear =
  '(?<day>\\d{1,2})(\\.|\\-)(?<month>\\d{1,2})((\\.|\\-)(?<year>\\d{2,4}))?( (?<date_timezone>[a-z]{3,4}))?'
const dateYearMonthDay =
  '(?<year>\\d{4})(\\.|\\-)(?<month>\\d{1,2})(\\.|\\-)(?<day>\\d{1,2})( (?<date_timezone>[a-z]{3,4}))?'

const dates = [
  //
  dateDayMonthYear,
  dateYearMonthDay,
]

const dateRegexes = dates.map(part => new RegExp(` ((on|на) )?${part}$`, 'i'))
const dateRegexes2 = dates.map(part => `((on|на) )?${part}`)

const timeHoursWithMinutes = '((at|о|в|на) )?(?<hours>\\d{1,2}):(?<minutes>\\d{2})( (?<time_timezone>[a-z]{3,4}))?'
const timeHours = '(at|о|в|на) (?<hours>\\d{1,2})( (?<time_timezone>[a-z]{3,4}))?'

const times = [
  // time
  timeHoursWithMinutes,
  timeHours,
]

const timeRegexes = times.map(part => new RegExp(` ${part}$`, 'i'))
const timeRegexes2 = times

const datetimes = [
  //
  ...dateRegexes2.flatMap(dateRegex => timeRegexes2.map(timeRegex => [dateRegex, timeRegex])),
  ...timeRegexes2.flatMap(timeRegex => dateRegexes2.map(dateRegex => [timeRegex, dateRegex])),
]

const datetimeRegexes = datetimes.map(parts => new RegExp(` ${parts.join('( |, ?)')}$`, 'i'))

/**
 * @param {string} input
 * @returns {{
 *   title: string
 *   interval?: { days?: number; hours?: number; minutes?: number }
 *   date?: { year?: number; month?: number; day?: number }
 *   time?: { hours?: number; minutes?: number }
 *   timezone?: string // CET
 * } | undefined}
 */
export function parseCountdown(input) {
  input = input.replaceAll(/\s+/g, ' ').trim() // normalize

  /** @type {any[]} */
  const intervals = []
  /** @type {any[]} */
  const datetimes = []
  /** @type {any[]} */
  const dates = []
  /** @type {any[]} */
  const times = []

  for (const regex of intervalRegexes) {
    const match = input.match(regex)
    if (match?.index === undefined) continue

    intervals.push({ index: match.index, ...match.groups })
  }

  for (const regex of datetimeRegexes) {
    const match = input.match(regex)
    if (match?.index === undefined) continue

    datetimes.push({ index: match.index, ...match.groups })
  }

  for (const regex of dateRegexes) {
    const match = input.match(regex)
    if (match?.index === undefined) continue

    dates.push({ index: match.index, ...match.groups })
  }

  for (const regex of timeRegexes) {
    const match = input.match(regex)
    if (match?.index === undefined) continue

    times.push({ index: match.index, ...match.groups })
  }

  if (intervals.length > 0) {
    const title = input.slice(0, Math.min(...intervals.map(i => i.index))).trim()
    if (!title) return undefined

    const groups = Object.assign({}, ...intervals)

    const interval = {
      ...(groups.days && { days: Number(groups.days) }),
      ...(groups.hours && { hours: Number(groups.hours) }),
      ...(groups.minutes && { minutes: Number(groups.minutes) }),
    }

    if (Object.keys(interval).length === 0) return undefined

    // 1.5 hours => 1 hour 30 minutes
    if (interval.hours && String(interval.hours).includes('.')) {
      const minutes = interval.hours * 60
      interval.hours = Math.floor(minutes / 60)
      interval.minutes = minutes % 60
    }

    return { title, interval }
  } else {
    const title = input.slice(0, Math.min(...[...dates, ...times, ...datetimes].map(i => i.index))).trim()
    if (!title) return undefined

    const groups = Object.assign({}, ...dates, ...times, ...datetimes)

    const date = {
      ...(groups.year && { year: Number(groups.year) }),
      ...(groups.month && { month: Number(groups.month) }),
      ...(groups.day && { day: Number(groups.day) }),
    }

    // 26 => 2026
    if (date.year && date.year < 100) {
      date.year += 2000
    }

    const time = {
      ...(groups.hours && { hours: Number(groups.hours) }),
      ...(groups.minutes && { minutes: Number(groups.minutes) }),
    }

    const timezone = groups.time_timezone || groups.date_timezone

    if (Object.keys(date).length === 0 && Object.keys(time).length === 0) return undefined

    const result = {
      title,
      ...(Object.keys(date).length > 0 && { date }),
      ...(Object.keys(time).length > 0 && { time }),
      ...(timezone && { timezone }),
    }

    return result
  }
}
