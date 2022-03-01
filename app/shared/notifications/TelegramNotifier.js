export class TelegramNotifier {
  constructor({ bot }) {
    this._bot = bot
  }

  async notify(userId, message) {
    await this._bot.telegram.sendMessage(userId, message.trim())
  }
}
