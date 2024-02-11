import pino from 'pino'
import build from 'pino-abstract-transport'
import { Telegraf } from 'telegraf'
import { escapeMd } from '../telegram.js'

/**
 * @param {{
 *   telegramBotToken: string
 *   debugChatId: string
 * }} options
 */
export default async function ({ telegramBotToken, debugChatId }) {
  const bot = new Telegraf(telegramBotToken)
  const botInfo = await bot.telegram.getMe()

  return build(async function (stream) {
    for await (let log of stream) {
      const { level, msg, time, pid, hostname, ...context } = log

      try {
        await bot.telegram.sendMessage(
          Number(debugChatId),
          [
            `⚠️ *${escapeMd(pino.levels.labels[level].toUpperCase())}*: ${escapeMd(msg)}`,
            `🤖 ${escapeMd(`@${botInfo.username}`)}`,
            `📆 ${escapeMd(new Date(time).toISOString())}`,
            Object.keys(context).length > 0 && `\`\`\`json
            ${escapeMd(JSON.stringify(context, null, 2))}
            \`\`\``,
          ].filter(Boolean).join('\n'),
          // `❗️ *${$level}* ${$bot}: ${$message}${$context} *${$date}*`,
          { parse_mode: 'MarkdownV2' }
        )
      } catch (err) {
        if (err?.code !== 429) {
          console.warn('Could not send log to Telegram:', err)
        }
      }
    }
  })
}
