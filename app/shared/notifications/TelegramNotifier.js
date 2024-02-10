import { disableTelegramApi } from '../../../env.js'

export class TelegramNotifier {
  /**
   * @param {{
   *   telegram: import('telegraf').Telegram
   * }} input
   */
  constructor({ telegram }) {
    this._telegram = telegram
  }

  /**
   * @param {string} userId
   * @param {string} message
   */
  async notify(userId, message) {
    if (disableTelegramApi) return
    await this._telegram.sendMessage(Number(userId), message.trim(), { parse_mode: 'MarkdownV2', disable_web_page_preview: true })
  }
}
