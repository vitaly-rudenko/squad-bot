import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { stripIndent } from 'common-tags'
import { sendPaymentDeletedNotification, sendPaymentSavedNotification } from '../../../../src/payments/notifications.js'
import { createTelegramMock } from '../../helpers/telegram.js'
import { createUser, createUsersStorage } from '../../helpers/users.js'
import { localizeMock } from '../../helpers/localization.js'
import { escapeMd } from '../../../../src/common/telegram.js'
import { generateWebAppUrlMock } from '../../helpers/common.js'
import { createDebtsStorage } from '../../helpers/debts.js'
import { createPaymentsStorage } from '../../helpers/payments.js'

chai.use(deepEqualInAnyOrder)

describe('payments/notifications', () => {
  describe('sendPaymentSavedNotification()', () => {
    it('notifies participants on create', async () => {
      const { telegram, telegramMock } = createTelegramMock()
      const sender = createUser()
      const receiver = createUser()
      const editor = createUser()

      await sendPaymentSavedNotification({
        payment: {
          id: 'fake-payment-id',
          fromUserId: sender.id,
          toUserId: receiver.id,
          amount: 1200,
          createdAt: new Date(),
        },
        action: 'create',
        editorId: editor.id,
      }, {
        localize: localizeMock,
        telegram,
        usersStorage: createUsersStorage([sender, receiver, editor]),
        generateWebAppUrl: generateWebAppUrlMock,
        debtsStorage: createDebtsStorage([]),
        paymentsStorage: createPaymentsStorage([]),
      })

      const options = {
        disable_web_page_preview: true,
        parse_mode: 'MarkdownV2',
      }

      expect(telegramMock.sendMessage.args)
        .to.deep.equalInAnyOrder([
          [Number(editor.id), stripIndent`
            payments.notifications.saved.message(${editor.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.create(${editor.locale})
              debts: payments.notifications.saved.checkDebts(${editor.locale})
            `, options],
          [Number(sender.id), stripIndent`
            payments.notifications.saved.message(${sender.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.create(${sender.locale})
              debts: payments.notifications.saved.checkDebts(${sender.locale})
          `, options],
          [Number(receiver.id), stripIndent`
            payments.notifications.saved.message(${receiver.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.create(${receiver.locale})
              debts: payments.notifications.saved.checkDebts(${receiver.locale})
          `, options]
        ])
    })

    it('notifies participants on update', async () => {
      const { telegram, telegramMock } = createTelegramMock()
      const sender = createUser()
      const receiver = createUser()
      const editor = createUser()

      await sendPaymentSavedNotification({
        payment: {
          id: 'fake-payment-id',
          fromUserId: sender.id,
          toUserId: receiver.id,
          amount: 1200,
          createdAt: new Date(),
        },
        action: 'update',
        editorId: editor.id,
      }, {
        localize: localizeMock,
        telegram,
        usersStorage: createUsersStorage([sender, receiver, editor]),
        generateWebAppUrl: generateWebAppUrlMock,
        debtsStorage: createDebtsStorage([]),
        paymentsStorage: createPaymentsStorage([]),
      })

      const options = {
        disable_web_page_preview: true,
        parse_mode: 'MarkdownV2',
      }

      expect(telegramMock.sendMessage.args)
        .to.deep.equalInAnyOrder([
          [Number(editor.id), stripIndent`
            payments.notifications.saved.message(${editor.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.update(${editor.locale})
              debts: payments.notifications.saved.checkDebts(${editor.locale})
          `, options],
          [Number(sender.id), stripIndent`
            payments.notifications.saved.message(${sender.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.update(${sender.locale})
              debts: payments.notifications.saved.checkDebts(${sender.locale})
          `, options],
          [Number(receiver.id), stripIndent`
            payments.notifications.saved.message(${receiver.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.update(${receiver.locale})
              debts: payments.notifications.saved.checkDebts(${receiver.locale})
          `, options]
        ])
    })
  })

  describe('sendPaymentDeletedNotification()', () => {
    it('notifies participants', async () => {
      const { telegram, telegramMock } = createTelegramMock()
      const sender = createUser()
      const receiver = createUser()
      const editor = createUser()

      await sendPaymentDeletedNotification({
        payment: {
          id: 'fake-payment-id',
          fromUserId: sender.id,
          toUserId: receiver.id,
          amount: 1200,
          createdAt: new Date(),
        },
        editorId: editor.id,
      }, {
        localize: localizeMock,
        telegram,
        usersStorage: createUsersStorage([sender, receiver, editor]),
      })

      const options = {
        disable_web_page_preview: true,
        parse_mode: 'MarkdownV2',
      }

      expect(telegramMock.sendMessage.args)
        .to.deep.equalInAnyOrder([
          [Number(editor.id), stripIndent`
            payments.notifications.deleted.message(${editor.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
          `, options],
          [Number(sender.id), stripIndent`
            payments.notifications.deleted.message(${sender.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
          `, options],
          [Number(receiver.id), stripIndent`
            payments.notifications.deleted.message(${receiver.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
          `, options],
        ])
    })
  })
})
