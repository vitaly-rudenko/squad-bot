import { escapeMd } from '../common/telegram.js'
import { registry } from '../registry.js'
import { calculateEndsAt, parseCountdown } from './utils.js'

// TODO: Trigger on ~ prefix (e.g. "~overwatch in 2 hours")

export function createCountdownsFlow() {
  const { countdownsStorage, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const countdown = async context => {
    const { chatId, locale } = context.state

    const countdown = parseCountdown(context.payload)
    if (!countdown) {
      await context.reply(localize(locale, 'countdowns.command.help'), { parse_mode: 'MarkdownV2' })
      return
    }

    const endsAt = calculateEndsAt({
      defaultTimezone: 'EET',
      interval: countdown.interval,
      date: countdown.date,
      time: countdown.time,
      timezone: countdown.timezone,
    })

    const _countdown = await countdownsStorage.create({
      chatId,
      title: countdown.title,
      endsAt,
    })

    await context.reply(
      localize(locale, 'countdowns.command.message', {
        title: escapeMd(countdown.title),
        timeLeft: escapeMd('? hours'), // TODO: time left
        date: escapeMd(endsAt.toISOString()),
      }),
      { parse_mode: 'MarkdownV2' }
    )

    console.log('Created countdown', _countdown, 'from', countdown)
  }

  return {
    countdown,
  }
}
