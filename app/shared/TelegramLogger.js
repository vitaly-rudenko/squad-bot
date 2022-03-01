export class TelegramLogger {
  constructor({ bot, debugChatId }) {
    this._debugChatId = debugChatId
    this._bot = bot
  }
  
  async error(error) {
    console.error('Unexpected error:', error)

    try {
      await this._bot.telegram.sendMessage(
        this._debugChatId,
        `❗️Unexpected error at ${new Date().toISOString()}❗️\n${error.name}: ${error.message}\n\nStack:\n${error.stack}`
      )
    } catch (error) {
      console.warn('Could not post log to debug chat:', error)
    }
  }
}
