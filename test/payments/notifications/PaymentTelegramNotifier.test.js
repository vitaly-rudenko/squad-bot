import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { spy } from 'sinon'
import { Debt } from '../../../app/debts/Debt.js'
import { PaymentTelegramNotifier } from '../../../app/payments/notifications/PaymentTelegramNotifier.js'
import { stripIndent } from 'common-tags'
import { localizeMock } from '../../helpers/localizeMock.js'
import { UsersMockStorage } from '../../helpers/UsersMockStorage.js'
import { createUser } from '../../helpers/createUser.js'

chai.use(deepEqualInAnyOrder)

describe('PaymentTelegramNotifier', () => {
  /** @type {PaymentTelegramNotifier} */
  let paymentTelegramNotifier
  /** @type {UsersMockStorage} */
  let usersStorage
  let telegramNotifier
  let logger

  beforeEach(() => {
    telegramNotifier = {
      notify: spy(),
    }

    usersStorage = new UsersMockStorage()
    
    logger = {
      error: spy(),
    }

    paymentTelegramNotifier = new PaymentTelegramNotifier({
      telegramNotifier,
      usersStorage,
      localize: localizeMock,
      logger,
    })
  })

  describe('[payment created]', () => {
    it('should notify participants about new payments', async () => {
      const sender = createUser()
      const receiver = createUser()
      const editor = createUser()

      usersStorage.mock_storeUsers(sender, receiver, editor)

      await paymentTelegramNotifier.created({
        fromUserId: sender.id,
        toUserId: receiver.id,
        amount: 1200,
      }, { editorId: editor.id })

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [sender.id, stripIndent`
            notifications.paymentStored.message(${sender.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              senderName: ${sender.name}
              senderUsername: ${sender.username}
              receiverName: ${receiver.name}
              receiverUsername: ${receiver.username}
              amount: 12 грн
              action: notifications.paymentStored.actions.added(${sender.locale})
          `],
          [receiver.id, stripIndent`
            notifications.paymentStored.message(${receiver.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              senderName: ${sender.name}
              senderUsername: ${sender.username}
              receiverName: ${receiver.name}
              receiverUsername: ${receiver.username}
              amount: 12 грн
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

      await paymentTelegramNotifier.updated({
        fromUserId: sender.id,
        toUserId: receiver.id,
        amount: 1230,
      }, { editorId: editor.id })

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [sender.id, stripIndent`
            notifications.paymentStored.message(${sender.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              senderName: ${sender.name}
              senderUsername: ${sender.username}
              receiverName: ${receiver.name}
              receiverUsername: ${receiver.username}
              amount: 12.30 грн
              action: notifications.paymentStored.actions.updated(${sender.locale})
          `],
          [receiver.id, stripIndent`
            notifications.paymentStored.message(${receiver.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              senderName: ${sender.name}
              senderUsername: ${sender.username}
              receiverName: ${receiver.name}
              receiverUsername: ${receiver.username}
              amount: 12.30 грн
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

      await paymentTelegramNotifier.deleted({
        fromUserId: sender.id,
        toUserId: receiver.id,
        amount: 1234,
      }, { editorId: editor.id })

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [sender.id, stripIndent`
            notifications.paymentDeleted.message(${sender.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              senderName: ${sender.name}
              senderUsername: ${sender.username}
              receiverName: ${receiver.name}
              receiverUsername: ${receiver.username}
              amount: 12.34 грн
          `],
          [receiver.id, stripIndent`
            notifications.paymentDeleted.message(${receiver.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              senderName: ${sender.name}
              senderUsername: ${sender.username}
              receiverName: ${receiver.name}
              receiverUsername: ${receiver.username}
              amount: 12.34 грн
          `]
        ])
    })
  })
})
