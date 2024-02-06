import { logger } from '../../logger.js'

export class TelegramErrorLogger {
  constructor({ telegram, debugChatId }) {
    this._debugChatId = debugChatId
    this._telegram = telegram
  }

  log(err, message = 'Unexpected error', context = {}) {
    logger.error({ error: err, context }, message)

    this._telegram.sendMessage(
      this._debugChatId,
      [
        `❗️ ${new Date().toISOString().replace('T', ' ').replace('Z', '')} ${message}:`,
        String(err.stack) || `${err.name}: ${err.message}`,
        `Context:`,
        `${JSON.stringify(context)}`
      ].join('\n')
    ).catch((err) => logger.warn({ err }, 'Could not log to the debug chat'))
  }
}
