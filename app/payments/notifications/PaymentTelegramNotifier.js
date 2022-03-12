import { escapeMd } from '../../utils/escapeMd.js'
import { renderMoney } from '../../utils/renderMoney.js'

export class PaymentTelegramNotifier {
  constructor({ usersStorage, massTelegramNotificationFactory, localize }) {
    this._usersStorage = usersStorage
    this._massTelegramNotificationFactory = massTelegramNotificationFactory
    this._localize = localize
  }

  async deleted(payment, { editorId }) {
    const { fromUserId, toUserId, amount } = payment
    
    const editor = await this._usersStorage.findById(editorId)
    const sender = await this._usersStorage.findById(fromUserId)
    const receiver = await this._usersStorage.findById(toUserId)

    const massNotification = this._massTelegramNotificationFactory.create()

    for (const user of [sender, receiver]) {
      if (!user.isComplete) continue

      const notification = this._localize(user.locale, 'notifications.paymentDeleted.message', {
        editorName: escapeMd(editor.name),
        editorUsername: escapeMd(editor.username),
        senderName: escapeMd(sender.name),
        senderUsername: escapeMd(sender.username),
        receiverName: escapeMd(receiver.name),
        receiverUsername: escapeMd(receiver.username),
        amount: renderMoney(amount),
      })
  
      massNotification.add(user.id, notification)
    }

    return massNotification
  }

  /** @param {import('../Payment').Payment} payment */
  async created(payment, { editorId }) {
    return this._stored(payment, { editorId, isNew: true })
  }

  /** @param {import('../Payment').Payment} payment */
  async updated(payment, { editorId }) {
    return this._stored(payment, { editorId, isNew: false })
  }

  /** @param {import('../Payment').Payment} payment */
  async _stored(payment, { editorId, isNew }) {
    const { fromUserId, toUserId, amount } = payment
    
    const editor = await this._usersStorage.findById(editorId)
    const sender = await this._usersStorage.findById(fromUserId)
    const receiver = await this._usersStorage.findById(toUserId)

    const massNotification = this._massTelegramNotificationFactory.create()

    for (const user of [sender, receiver]) {
      if (!user.isComplete) continue

      const notification = this._localize(user.locale, 'notifications.paymentStored.message', {
        editorName: escapeMd(editor.name),
        editorUsername: escapeMd(editor.username),
        senderName: escapeMd(sender.name),
        senderUsername: escapeMd(sender.username),
        receiverName: escapeMd(receiver.name),
        receiverUsername: escapeMd(receiver.username),
        amount: renderMoney(amount),
        action: this._localize(
          user.locale,
          isNew
            ? 'notifications.paymentStored.actions.added'
            : 'notifications.paymentStored.actions.updated',
        ),
      })
  
      massNotification.add(user.id, notification)
    }

    return massNotification
  }
}
