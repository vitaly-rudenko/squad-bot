import { spy } from 'sinon'
import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { stripIndent } from 'common-tags'
import { sendPaymentDeletedNotification, sendPaymentSavedNotification } from '../../../../app/features/payments/notifications.js'
import { escapeMd } from '../../../../app/utils/escapeMd.js'
import { createUser } from '../../helpers/createUser.js'
import { UsersMockStorage } from '../../helpers/UsersMockStorage.js'
import { localizeMock } from '../../helpers/localizeMock.js'

chai.use(deepEqualInAnyOrder)

/**
 * @param {T[]} users
 * @returns {import('../../../../app/users/UsersPostgresStorage.js').UsersPostgresStorage}
 * @template {import('../../../../app/users/User.js').User} T
 */
function createUsersStorage(users) {
  const usersStorage = new UsersMockStorage()
  usersStorage.mock_storeUsers(...users)
  // @ts-ignore
  return usersStorage
}

function createTelegramMock() {
  const telegramMock = {
    sendMessage: spy(),
  }

  /** @type {import('telegraf').Telegram} */
  // @ts-ignore
  const telegram = telegramMock

  return { telegram, telegramMock }
}

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
          [sender.id, stripIndent`
            payments.notifications.saved.message(${sender.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.create(${sender.locale})
          `, options],
          [receiver.id, stripIndent`
            payments.notifications.saved.message(${receiver.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.create(${receiver.locale})
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
          [sender.id, stripIndent`
            payments.notifications.saved.message(${sender.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.update(${sender.locale})
          `, options],
          [receiver.id, stripIndent`
            payments.notifications.saved.message(${receiver.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
              action: payments.notifications.saved.action.update(${receiver.locale})
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
          [sender.id, stripIndent`
            payments.notifications.deleted.message(${sender.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
          `, options],
          [receiver.id, stripIndent`
            payments.notifications.deleted.message(${receiver.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              sender: ${escapeMd(`${sender.name} (@${sender.username})`)}
              receiver: ${escapeMd(`${receiver.name} (@${receiver.username})`)}
              amount: ₴12
          `, options]
        ])
    })
  })
})
