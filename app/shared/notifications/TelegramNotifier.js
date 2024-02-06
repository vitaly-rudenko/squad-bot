import { disableTelegramApi } from '../../../env.js'

export class TelegramNotifier {
  constructor({ telegram }) {
    this._telegram = telegram
  }

  async notify(userId, message) {
      if (disableTelegramApi) return
      await this._telegram.sendMessage(userId, message.trim(), { parse_mode: 'MarkdownV2', disable_web_page_preview: true })
  }
}
