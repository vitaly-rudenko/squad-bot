import { logger } from '../../logger.js'

export class TelegramErrorLogger {
  constructor({ telegram, debugChatId }) {
    this._debugChatId = debugChatId
    this._telegram = telegram
  }

  log(error, message = 'Unexpected error:', context = {}) {
    logger.error(`${message}:`, error, context)

    this._telegram.sendMessage(
      this._debugChatId,
      [
        `❗️ ${new Date().toISOString().replace('T', ' ').replace('Z', '')} ${message}:`,
        String(error.stack) || `${error.name}: ${error.message}`,
        `Context:`,
        `${JSON.stringify(context)}`
      ].join('\n')
    ).catch(error => logger.warn('Could not log to the debug chat:', error))
  }
}
