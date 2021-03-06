import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { spy } from 'sinon'
import { PaymentTelegramNotifier } from '../../../../app/payments/notifications/PaymentTelegramNotifier.js'
import { stripIndent } from 'common-tags'
import { localizeMock } from '../../helpers/localizeMock.js'
import { UsersMockStorage } from '../../helpers/UsersMockStorage.js'
import { createUser } from '../../helpers/createUser.js'
import { MassTelegramNotificationFactory } from '../../../../app/shared/notifications/MassTelegramNotification.js'
import { Payment } from '../../../../app/payments/Payment.js'
import { escapeMd } from '../../../../app/utils/escapeMd.js'

chai.use(deepEqualInAnyOrder)

describe('PaymentTelegramNotifier', () => {
  /** @type {PaymentTelegramNotifier} */
  let paymentTelegramNotifier
  /** @type {UsersMockStorage} */
  let usersStorage
  let telegramNotifier

  beforeEach(() => {
    telegramNotifier = {
      notify: spy(),
    }

    usersStorage = new UsersMockStorage()

    const errorLogger = { log: spy() }

    paymentTelegramNotifier = new PaymentTelegramNotifier({
      massTelegramNotificationFactory: new MassTelegramNotificationFactory({
        telegramNotifier,
        errorLogger,
      }),
      usersStorage,
      localize: localizeMock,
    })
  })

  describe('[payment created]', () => {
    it('should notify participants about new payments', async () => {
      const sender = createUser()
      const receiver = createUser()
      const editor = createUser()

      usersStorage.mock_storeUsers(sender, receiver, editor)

      const payment = new Payment({
        fromUserId: sender.id,
        toUserId: receiver.id,
        amount: 1200,
      })

      const notification = await paymentTelegramNotifier.created(payment, { editorId: editor.id })
      await notification.send()

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [sender.id, stripIndent`
            notifications.paymentStored.message(${sender.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              senderName: ${escapeMd(sender.name)}
              senderUsername: ${escapeMd(sender.username)}
              receiverName: ${escapeMd(receiver.name)}
              receiverUsername: ${escapeMd(receiver.username)}
              amount: 12 ??????
              action: notifications.paymentStored.actions.added(${sender.locale})
          `],
          [receiver.id, stripIndent`
            notifications.paymentStored.message(${receiver.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              senderName: ${escapeMd(sender.name)}
              senderUsername: ${escapeMd(sender.username)}
              receiverName: ${escapeMd(receiver.name)}
              receiverUsername: ${escapeMd(receiver.username)}
              amount: 12 ??????
              action: notifications.paymentStored.actions.added(${receiver.locale})
          `]
        ])
    })
  })

  describe('[payment updated]', () => {
    it('should notify participants about updated payments', async () => {
      const sender = createUser()
      const receiver = createUser()
      const editor = createUser()

      usersStorage.mock_storeUsers(sender, receiver, editor)

      const payment = new Payment({
        fromUserId: sender.id,
        toUserId: receiver.id,
        amount: 1230,
      })

      const notification = await paymentTelegramNotifier.updated(payment, { editorId: editor.id })
      await notification.send()

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [sender.id, stripIndent`
            notifications.paymentStored.message(${sender.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              senderName: ${escapeMd(sender.name)}
              senderUsername: ${escapeMd(sender.username)}
              receiverName: ${escapeMd(receiver.name)}
              receiverUsername: ${escapeMd(receiver.username)}
              amount: 12\\.30 ??????
              action: notifications.paymentStored.actions.updated(${sender.locale})
          `],
          [receiver.id, stripIndent`
            notifications.paymentStored.message(${receiver.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              senderName: ${escapeMd(sender.name)}
              senderUsername: ${escapeMd(sender.username)}
              receiverName: ${escapeMd(receiver.name)}
              receiverUsername: ${escapeMd(receiver.username)}
              amount: 12\\.30 ??????
              action: notifications.paymentStored.actions.updated(${receiver.locale})
          `]
        ])
    })
  })

  describe('[payment deleted]', () => {
    it('should notify participants about deleted payments', async () => {
      const sender = createUser()
      const receiver = createUser()
      const editor = createUser()

      usersStorage.mock_storeUsers(sender, receiver, editor)

      const payment = new Payment({
        fromUserId: sender.id,
        toUserId: receiver.id,
        amount: 1234,
      })

      const notification = await paymentTelegramNotifier.deleted(payment, { editorId: editor.id })
      await notification.send()

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [sender.id, stripIndent`
            notifications.paymentDeleted.message(${sender.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              senderName: ${escapeMd(sender.name)}
              senderUsername: ${escapeMd(sender.username)}
              receiverName: ${escapeMd(receiver.name)}
              receiverUsername: ${escapeMd(receiver.username)}
              amount: 12\\.34 ??????
          `],
          [receiver.id, stripIndent`
            notifications.paymentDeleted.message(${receiver.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              senderName: ${escapeMd(sender.name)}
              senderUsername: ${escapeMd(sender.username)}
              receiverName: ${escapeMd(receiver.name)}
              receiverUsername: ${escapeMd(receiver.username)}
              amount: 12\\.34 ??????
          `]
        ])
    })
  })
})
