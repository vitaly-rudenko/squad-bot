import { escapeMd } from '../../utils/escapeMd.js'
import { renderMoney } from '../../utils/renderMoney.js'

export class PaymentTelegramNotifier {
  constructor({ usersStorage, telegramNotifier, localize, logger }) {
    this._usersStorage = usersStorage
    this._telegramNotifier = telegramNotifier
    this._localize = localize
    this._logger = logger
  }

  async deleted(payment, { editorId }) {
    const { fromUserId, toUserId, amount } = payment
    
    const editor = await this._usersStorage.findById(editorId)
    const sender = await this._usersStorage.findById(fromUserId)
    const receiver = await this._usersStorage.findById(toUserId)

    for (const user of [sender, receiver]) {
      if (!user.isComplete) continue

      const notification = this._localize(user.locale, 'notifications.paymentDeleted.message', {
        editorName: escapeMd(editor.name),
        editorUsername: escapeMd(editor.username),
        senderName: escapeMd(sender.name),
        senderUsername: escapeMd(sender.username),
        receiverName: escapeMd(receiver.name),
        receiverUsername: escapeMd(receiver.username),
        amount: `${renderMoney(amount)} грн`,
      })
  
      try {
        await this._telegramNotifier.notify(user.id, notification)
      } catch (error) {
        this._logger.error(error)
      }
    }
  }

  async created(payment, { editorId }) {
    await this._notify(payment, { editorId, isNew: true })
  }

  async updated(payment, { editorId }) {
    await this._notify(payment, { editorId, isNew: false })
  }

  async _notify(payment, { editorId, isNew }) {
    const { fromUserId, toUserId, amount } = payment
    
    const editor = await this._usersStorage.findById(editorId)
    const sender = await this._usersStorage.findById(fromUserId)
    const receiver = await this._usersStorage.findById(toUserId)

    for (const user of [sender, receiver]) {
      if (!user.isComplete) continue

      const notification = this._localize(user.locale, 'notifications.paymentStored.message', {
        editorName: escapeMd(editor.name),
        editorUsername: escapeMd(editor.username),
        senderName: escapeMd(sender.name),
        senderUsername: escapeMd(sender.username),
        receiverName: escapeMd(receiver.name),
        receiverUsername: escapeMd(receiver.username),
        amount: `${renderMoney(amount)} грн`,
        action: this._localize(
          user.locale,
          isNew
            ? 'notifications.paymentStored.actions.added'
            : 'notifications.paymentStored.actions.updated',
        ),
      })
  
      try {
        await this._telegramNotifier.notify(user.id, notification)
      } catch (error) {
        this._logger.error(error)
      }
    }
  }
}
