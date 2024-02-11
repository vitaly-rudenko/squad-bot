import path from 'path'
import { pino } from 'pino'
import { fileURLToPath } from 'url'
import { logLevel } from '../env.js'
import { string } from 'superstruct'

console.log('Log level:', logLevel)

export const logger = pino({
  level: logLevel,
  transport: {
    targets: [{
      level: 'error',
      target: path.join(path.dirname(fileURLToPath(import.meta.url)), './pino/telegram-transport.js'),
      options: {
        telegramBotToken: string().create(process.env.TELEGRAM_BOT_TOKEN),
        debugChatId: string().create(process.env.DEBUG_CHAT_ID),
      },
    }, {
      level: logLevel,
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: true,
      },
    }]
  }
})
