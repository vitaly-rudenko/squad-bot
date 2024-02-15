import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { stripIndent } from 'common-tags'
import { sendReceiptDeletedNotification, sendReceiptSavedNotification } from '../../../../src/receipts/notifications.js'
import { createTelegramMock } from '../../helpers/telegram.js'
import { createUser, createUsersStorage } from '../../helpers/users.js'
import { localizeMock } from '../../helpers/localization.js'
import { createDebt, createDebtsStorage } from '../../helpers/debts.js'
import { escapeMd } from '../../../../src/common/telegram.js'
import { generateWebAppUrlMock } from '../../helpers/common.js'
import { Markup } from 'telegraf'
import { createPaymentsStorage } from '../../helpers/payments.js'

chai.use(deepEqualInAnyOrder)

const options = {
  disable_web_page_preview: true,
  parse_mode: 'MarkdownV2',
}

/** @param {string} locale */
function optionsWithGetPhoto(locale) {
  return {
    disable_web_page_preview: true,
    parse_mode: 'MarkdownV2',
    ...Markup.inlineKeyboard([
      Markup.button.callback(`receipts.actions.getPhoto(${locale})`, 'photo:photo.jpg')
    ])
  }
}


describe('receipts/notifications', () => {
  describe('sendReceiptSavedNotification()', () => {
    it('notifies participants on create', async () => {
      const { telegram, telegramMock } = createTelegramMock()
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      await sendReceiptSavedNotification({
        receipt: {
          id: 'fake-receipt-id',
          amount: 1200,
          payerId: payer.id,
          photoFilename: 'photo.jpg',
          createdAt: new Date(),
          description: 'Hello world!',
        },
        debts: [
          createDebt({ receiptId: 'fake-receipt-id', debtorId: payer.id, amount: 4321 }),
          createDebt({ receiptId: 'fake-receipt-id', debtorId: debtor.id, amount: 1200 }),
        ],
        action: 'create',
        editorId: editor.id,
      }, {
        localize: localizeMock,
        usersStorage: createUsersStorage([editor, payer, debtor]),
        telegram,
        generateWebAppUrl: generateWebAppUrlMock,
        debtsStorage: createDebtsStorage([]),
        paymentsStorage: createPaymentsStorage([]),
      })

      expect(telegramMock.sendMessage.args)
        .to.deep.equalInAnyOrder([
          [Number(editor.id), stripIndent`
            receipts.notifications.saved.message(${editor.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              payer: ${escapeMd(`${payer.name} (@${payer.username})`)}
              action: receipts.notifications.saved.action.create(${editor.locale})
              amount: ₴12
              receiptUrl: ${escapeMd(`web-app-url(receipt-fake-receipt-id)`)}
              part: receipts.notifications.part(${editor.locale}):
                amount: ₴0
              description: receipts.notifications.saved.description(${editor.locale}):
                description: Hello world\\!
              debts: receipts.notifications.saved.checkDebts(${editor.locale})
          `, optionsWithGetPhoto(editor.locale)],
          [Number(payer.id), stripIndent`
            receipts.notifications.saved.message(${payer.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              payer: ${escapeMd(`${payer.name} (@${payer.username})`)}
              action: receipts.notifications.saved.action.create(${payer.locale})
              amount: ₴12
              receiptUrl: ${escapeMd(`web-app-url(receipt-fake-receipt-id)`)}
              part: receipts.notifications.part(${payer.locale}):
                amount: ₴43\\.21
              description: receipts.notifications.saved.description(${payer.locale}):
                description: Hello world\\!
              debts: receipts.notifications.saved.checkDebts(${payer.locale})
          `, optionsWithGetPhoto(payer.locale)],
          [Number(debtor.id), stripIndent`
            receipts.notifications.saved.message(${debtor.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              payer: ${escapeMd(`${payer.name} (@${payer.username})`)}
              action: receipts.notifications.saved.action.create(${debtor.locale})
              amount: ₴12
              receiptUrl: ${escapeMd(`web-app-url(receipt-fake-receipt-id)`)}
              part: receipts.notifications.part(${debtor.locale}):
                amount: ₴12
              description: receipts.notifications.saved.description(${debtor.locale}):
                description: Hello world\\!
              debts: receipts.notifications.saved.checkDebts(${debtor.locale})
          `, optionsWithGetPhoto(debtor.locale)]
        ])
    })

    it('notifies participants on update', async () => {
      const { telegram, telegramMock } = createTelegramMock()
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      await sendReceiptSavedNotification({
        receipt: {
          id: 'fake-receipt-id',
          amount: 1200,
          payerId: payer.id,
          photoFilename: 'photo.jpg',
          createdAt: new Date(),
          description: 'Hello world!',
        },
        debts: [
          createDebt({ receiptId: 'fake-receipt-id', debtorId: payer.id, amount: 4321 }),
          createDebt({ receiptId: 'fake-receipt-id', debtorId: debtor.id, amount: 1200 }),
        ],
        action: 'update',
        editorId: editor.id,
      }, {
        localize: localizeMock,
        usersStorage: createUsersStorage([editor, payer, debtor]),
        telegram,
        generateWebAppUrl: generateWebAppUrlMock,
        debtsStorage: createDebtsStorage([]),
        paymentsStorage: createPaymentsStorage([]),
      })

      expect(telegramMock.sendMessage.args)
        .to.deep.equalInAnyOrder([
          [Number(editor.id), stripIndent`
            receipts.notifications.saved.message(${editor.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              payer: ${escapeMd(`${payer.name} (@${payer.username})`)}
              action: receipts.notifications.saved.action.update(${editor.locale})
              amount: ₴12
              receiptUrl: ${escapeMd(`web-app-url(receipt-fake-receipt-id)`)}
              part: receipts.notifications.part(${editor.locale}):
                amount: ₴0
              description: receipts.notifications.saved.description(${editor.locale}):
                description: Hello world\\!
              debts: receipts.notifications.saved.checkDebts(${editor.locale})
          `, optionsWithGetPhoto(editor.locale)],
          [Number(payer.id), stripIndent`
            receipts.notifications.saved.message(${payer.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              payer: ${escapeMd(`${payer.name} (@${payer.username})`)}
              action: receipts.notifications.saved.action.update(${payer.locale})
              amount: ₴12
              receiptUrl: ${escapeMd(`web-app-url(receipt-fake-receipt-id)`)}
              part: receipts.notifications.part(${payer.locale}):
                amount: ₴43\\.21
              description: receipts.notifications.saved.description(${payer.locale}):
                description: Hello world\\!
              debts: receipts.notifications.saved.checkDebts(${payer.locale})
          `, optionsWithGetPhoto(payer.locale)],
          [Number(debtor.id), stripIndent`
            receipts.notifications.saved.message(${debtor.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              payer: ${escapeMd(`${payer.name} (@${payer.username})`)}
              action: receipts.notifications.saved.action.update(${debtor.locale})
              amount: ₴12
              receiptUrl: ${escapeMd(`web-app-url(receipt-fake-receipt-id)`)}
              part: receipts.notifications.part(${debtor.locale}):
                amount: ₴12
              description: receipts.notifications.saved.description(${debtor.locale}):
                description: Hello world\\!
              debts: receipts.notifications.saved.checkDebts(${debtor.locale})
          `, optionsWithGetPhoto(debtor.locale)]
        ])
    })
  })

  describe('sendReceiptDeletedNotification()', () => {
    it('notifies participants', async () => {
      const { telegram, telegramMock } = createTelegramMock()
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      await sendReceiptDeletedNotification({
        receipt: {
          id: 'fake-receipt-id',
          amount: 1200,
          payerId: payer.id,
          photoFilename: 'photo.jpg',
          createdAt: new Date(),
          description: 'Hello world!',
        },
        debts: [
          createDebt({ receiptId: 'fake-receipt-id', debtorId: payer.id, amount: 4321 }),
          createDebt({ receiptId: 'fake-receipt-id', debtorId: debtor.id, amount: 1200 }),
        ],
        editorId: editor.id,
      }, {
        localize: localizeMock,
        usersStorage: createUsersStorage([editor, payer, debtor]),
        telegram,
      })

      expect(telegramMock.sendMessage.args)
        .to.deep.equalInAnyOrder([
          [Number(editor.id), stripIndent`
            receipts.notifications.deleted.message(${editor.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              payer: ${escapeMd(`${payer.name} (@${payer.username})`)}
              amount: ₴12
              part: receipts.notifications.part(${editor.locale}):
                amount: ₴0
              description: receipts.notifications.deleted.description(${editor.locale}):
                description: Hello world\\!
          `, options],
          [Number(payer.id), stripIndent`
            receipts.notifications.deleted.message(${payer.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              payer: ${escapeMd(`${payer.name} (@${payer.username})`)}
              amount: ₴12
              part: receipts.notifications.part(${payer.locale}):
                amount: ₴43\\.21
              description: receipts.notifications.deleted.description(${payer.locale}):
                description: Hello world\\!
          `, options],
          [Number(debtor.id), stripIndent`
            receipts.notifications.deleted.message(${debtor.locale}):
              editor: ${escapeMd(`${editor.name} (@${editor.username})`)}
              payer: ${escapeMd(`${payer.name} (@${payer.username})`)}
              amount: ₴12
              part: receipts.notifications.part(${debtor.locale}):
                amount: ₴12
              description: receipts.notifications.deleted.description(${debtor.locale}):
                description: Hello world\\!
          `, options]
        ])
    })
  })
})
