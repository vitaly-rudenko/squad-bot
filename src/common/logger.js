import path from 'path'
import { pino } from 'pino'
import { fileURLToPath } from 'url'
import { env } from '../env.js'
import { string } from 'superstruct'

console.log('Log level:', env.LOG_LEVEL)

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: {
    targets: [{
      level: 'error',
      target: path.join(path.dirname(fileURLToPath(import.meta.url)), './pino/telegram-transport.js'),
      options: {
        telegramBotToken: string().create(process.env.TELEGRAM_BOT_TOKEN),
        debugChatId: string().create(process.env.DEBUG_CHAT_ID),
      },
    }, {
      level: 'trace',
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: true,
      },
    }]
  }
})
