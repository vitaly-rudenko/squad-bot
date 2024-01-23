export class TelegramNotifier {
  constructor({ telegram }) {
    this._telegram = telegram
  }

  async notify(userId, message) {
    await this._telegram.sendMessage(userId, message.trim(), { parse_mode: 'MarkdownV2', disable_web_page_preview: true })
  }
}
