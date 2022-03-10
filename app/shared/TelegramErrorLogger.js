export class TelegramErrorLogger {
  constructor({ telegram, debugChatId }) {
    this._debugChatId = debugChatId
    this._telegram = telegram
  }

  log(error) {
    console.error('Unexpected error:', error)

    this._telegram.sendMessage(
      this._debugChatId,
      `❗️Unexpected error at ${new Date().toISOString()}❗️\n${error.name}: ${error.message}\n\nStack:\n${error.stack}`
    ).catch(error => console.warn('Could not log to the debug chat:', error))
  }
}
