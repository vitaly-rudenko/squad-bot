import { isNotificationErrorIgnorable } from '../../features/common/telegram.js'

export class MassTelegramNotification {
  constructor({ telegramNotifier, errorLogger }) {
    this._telegramNotifier = telegramNotifier
    this._errorLogger = errorLogger
    this._notifications = []
  }

  add(userId, message) {
    this._notifications.push([userId, message])
  }

  async send() {
    for (const [userId, message] of this._notifications) {
      try {
        await this._telegramNotifier.notify(userId, message)
      } catch (err) {
        if (!isNotificationErrorIgnorable(err)) {
          this._errorLogger.log(err, 'Could not send notification', { userId, message })
        }
      }
    }
  }
}

export class MassTelegramNotificationFactory {
  constructor({ telegramNotifier, errorLogger }) {
    this._telegramNotifier = telegramNotifier
    this._errorLogger = errorLogger
  }

  create() {
    return new MassTelegramNotification({
      telegramNotifier: this._telegramNotifier,
      errorLogger: this._errorLogger,
    })
  }
}
