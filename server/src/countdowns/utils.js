const dateRegexes = [
  /(^\s*|\b|\s)((?<year>\d{4})\-)?(?<month>\d{2})-(?<day>\d{2})(\b|\s*$)/,
  /(^\s*|\b|\s)(?<day>\d{2})\.(?<month>\d{2})\.((?<year>\d{4}))?(\b|\s*$)/,
]

const timeRegexes = [
  //
  /(^\s*|\b|\s)(?<hours>\d{1,2})(:(?<minutes>\d{2}))?(\b|\s*$)/,
]

const timezoneRegexes = [
  // NOTE: timezone is only supported at the end of the input
  /(^\s*|\b|\s)(?<timezone>[a-zA-Z]{3})$/,
]

const intervalRegexes = [
  //
  /(^\s*|\b|\s)((?<days>\d{1,2}) ?(d|days?|д|день|дні|днів|дн|д)\.?)(\b|\s*$)/i,
  /(^\s*|\b|\s)((?<hours>\d{1,2}) ?(h|hrs?|hours?|г|год|година|години|годин|годину)\.?)(\b|\s*$)/i,
  /(^\s*|\b|\s)((?<minutes>\d{1,2}) ?(m|mins?|minutes?|х|хв|хвилина|хвилини|хвилин|хвилину)\.?)(\b|\s*$)/i,
  /(^\s*|\b|\s)(in|через) (?<minutes>\d{1,2})\s*$/i,
  /(^\s*|\b|\s)(in|через) (?<hours>\d{1,2}):(?<minutes>\d{2})( ?(h|hrs?|hours?|г|год|годин|години|годину)\.?)?\s*$/i,
]

const skipped = [
  //
  /\b(in|at|on)\s*$/gi,
  /\b(через|в|о|на)\s*$/gi,
]

/**
 * @param {string} input
 * @returns {{
 *   title: string
 *   date?: { year?: number; month?: number; day?: number }
 *   time?: { hours?: number; minutes?: number }
 *   timezone?: string // CET
 *   interval?: { days?: number; hours?: number; minutes?: number }
 * }}
 */
export function parseCountdown(input) {
  const dates = []
  const times = []
  const timezones = []
  const intervals = []

  for (const dateRegex of dateRegexes) {
    const match = input.match(dateRegex)
    if (match) {
      dates.push({
        index: match.index,
        ...match.groups,
      })
    }
  }

  for (const timeRegex of timeRegexes) {
    const match = input.match(timeRegex)
    if (match) {
      times.push({
        index: match.index,
        ...match.groups,
      })
    }
  }

  for (const timezoneRegex of timezoneRegexes) {
    const match = input.match(timezoneRegex)
    if (match) {
      timezones.push({
        index: match.index,
        ...match.groups,
      })
    }
  }

  for (const intervalRegex of intervalRegexes) {
    const match = input.match(intervalRegex)
    if (match) {
      intervals.push({
        index: match.index,
        ...match.groups,
      })
    }
  }

  if (intervals.length > 0) {
    let title = input.slice(0, Math.min(...intervals.map(i => i.index)))
    for (const skip of skipped) {
      title = title.replaceAll(skip, '')
    }
    title = title.trim()

    let joined = {}
    for (const interval of intervals) {
      joined = { ...joined, ...interval }
    }

    const result = {
      title,
      interval: {
        ...(joined.days && { days: Number(joined.days) }),
        ...(joined.hours && { hours: Number(joined.hours) }),
        ...(joined.minutes && { minutes: Number(joined.minutes) }),
      },
    }

    console.log({ input, ...result })
    return result
  } else {
    let title = input.slice(0, Math.min(...[...dates, ...times, ...timezones].map(i => i.index)))
    for (const skip of skipped) {
      title = title.replaceAll(skip, '')
    }
    title = title.trim()

    let joined = {}
    for (const obj of [...dates, ...times, ...timezones]) {
      joined = { ...joined, ...obj }
    }

    const date = {
      ...(joined.year && { year: joined.year }),
      ...(joined.month && { month: joined.month }),
      ...(joined.day && { day: joined.day }),
    }

    const time = {
      ...(joined.hours && { hours: joined.hours }),
      ...(joined.minutes && { minutes: joined.minutes }),
    }

    const result = {
      title,
      ...(Object.keys(date).length > 0 && { date }),
      ...(Object.keys(time).length > 0 && { time }),
      ...(joined.timezone && { timezone: joined.timezone }),
    }

    console.log({ input, ...result })
    return result
  }
}

parseCountdown('новий рік через 3 дні')
parseCountdown('new year on 31.12.2026')
parseCountdown('new episode at 21:00 CET')
parseCountdown('новий епізод о 9:30')
parseCountdown('play games in 5 hours, 30 minutes')
parseCountdown('games in 20 mins')
parseCountdown('ігри 3г 20хв')
parseCountdown('episode in 3:30')
parseCountdown('episode in 30')
parseCountdown('ігри через 30')
