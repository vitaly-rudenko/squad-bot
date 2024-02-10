import { logger } from '../../logger.js'

export class TelegramErrorLogger {
  /**
   * @param {{
   *   telegram: import('telegraf').Telegram
   *   debugChatId: number
   * }} input
   */
  constructor({ telegram, debugChatId }) {
    this._debugChatId = debugChatId
    this._telegram = telegram
  }

  /**
   * @param {Error} err
   * @param {string} message
   * @param {any} [context]
   */
  log(err, message = 'Unexpected error', context) {
    logger.error({ err, context }, message)

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
