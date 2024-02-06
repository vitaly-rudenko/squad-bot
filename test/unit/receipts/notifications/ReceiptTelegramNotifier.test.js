import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { spy } from 'sinon'
import { ReceiptTelegramNotifier } from '../../../../app/receipts/notifications/ReceiptTelegramNotifier.js'
import { stripIndent } from 'common-tags'
import { localizeMock } from '../../helpers/localizeMock.js'
import { UsersMockStorage } from '../../helpers/UsersMockStorage.js'
import { createUser } from '../../helpers/createUser.js'
import { DebtsMockStorage } from '../../helpers/DebtsMockStorage.js'
import { MassTelegramNotificationFactory } from '../../../../app/shared/notifications/MassTelegramNotification.js'
import { escapeMd } from '../../../../app/utils/escapeMd.js'

chai.use(deepEqualInAnyOrder)

describe('ReceiptTelegramNotifier', () => {
  /** @type {ReceiptTelegramNotifier} */
  let receiptTelegramNotifier
  /** @type {UsersMockStorage} */
  let usersStorage
  /** @type {DebtsMockStorage} */
  let debtsStorage
  let telegramNotifier

  beforeEach(() => {
    telegramNotifier = {
      notify: spy(),
    }

    usersStorage = new UsersMockStorage()
    debtsStorage = new DebtsMockStorage()

    const errorLogger = { log: spy() }

    receiptTelegramNotifier = new ReceiptTelegramNotifier({
      massTelegramNotificationFactory: new MassTelegramNotificationFactory({
        telegramNotifier,
        errorLogger,
      }),
      usersStorage,
      debtsStorage,
      localize: localizeMock,
      generateWebAppUrl: (command) => `web-app-url(${command})`,
    })
  })

  describe('[receipt created]', () => {
    it('should notify participants about new receipts (description)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1200
      const description = 'Hello world!'

      debtsStorage.mock_storeDebts(
        {
          receiptId,
          debtorId: payer.id,
          amount: 4321,
        },
        {
          receiptId,
          debtorId: debtor.id,
          amount: 1200,
        },
      )

      const notification = await receiptTelegramNotifier.created({
        payerId: payer.id,
        amount,
        description,
        hasPhoto: false,
        createdAt: new Date(),
        id: receiptId,
      }, { editorId: editor.id })

      await notification.send()

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptStored.message(${payer.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              action: notifications.receiptStored.actions.added(${payer.locale})
              receiptDescription: notifications.receiptStored.description(${payer.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
              receiptUrl: ${escapeMd(`web-app-url(receipt-${receiptId})`)}
              part: notifications.receiptStored.part(${payer.locale}):
                partAmount: 43\\.21 грн
          `],
          [debtor.id, stripIndent`
            notifications.receiptStored.message(${debtor.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              action: notifications.receiptStored.actions.added(${debtor.locale})
              receiptDescription: notifications.receiptStored.description(${debtor.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
              receiptUrl: ${escapeMd(`web-app-url(receipt-${receiptId})`)}
              part: notifications.receiptStored.part(${debtor.locale}):
                partAmount: 12 грн
          `]
        ])
    })

    it('should notify participants about new receipts (no description)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1230

      debtsStorage.mock_storeDebts(
        {
          receiptId,
          debtorId: debtor.id,
          amount: 1200,
        },
      )

      const notification = await receiptTelegramNotifier.created({
        payerId: payer.id,
        amount,
        description: undefined,
        hasPhoto: false,
        createdAt: new Date(),
        id: receiptId,
      }, { editorId: editor.id })

      await notification.send()

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptStored.message(${payer.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              action: notifications.receiptStored.actions.added(${payer.locale})
              receiptDescription: notifications.receiptStored.noDescription(${payer.locale})
              receiptAmount: 12\\.30 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
              receiptUrl: ${escapeMd(`web-app-url(receipt-${receiptId})`)}
              part: ''
          `],
          [debtor.id, stripIndent`
            notifications.receiptStored.message(${debtor.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              action: notifications.receiptStored.actions.added(${debtor.locale})
              receiptDescription: notifications.receiptStored.noDescription(${debtor.locale})
              receiptAmount: 12\\.30 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
              receiptUrl: ${escapeMd(`web-app-url(receipt-${receiptId})`)}
              part: notifications.receiptStored.part(${debtor.locale}):
                partAmount: 12 грн
          `]
        ])
    })
  })

  describe('[receipt updated]', () => {
    it('should notify participants about updated receipts (description)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1200
      const description = 'Hello world!'

      debtsStorage.mock_storeDebts(
        {
          receiptId,
          debtorId: debtor.id,
          amount: 1200,
        },
      )

      const notification = await receiptTelegramNotifier.updated({
        payerId: payer.id,
        amount,
        description,
        hasPhoto: false,
        createdAt: new Date(),
        id: receiptId,
      }, { editorId: editor.id })

      await notification.send()

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptStored.message(${payer.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              action: notifications.receiptStored.actions.updated(${payer.locale})
              receiptDescription: notifications.receiptStored.description(${payer.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
              receiptUrl: ${escapeMd(`web-app-url(receipt-${receiptId})`)}
              part: ''
          `],
          [debtor.id, stripIndent`
            notifications.receiptStored.message(${debtor.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              action: notifications.receiptStored.actions.updated(${debtor.locale})
              receiptDescription: notifications.receiptStored.description(${debtor.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
              receiptUrl: ${escapeMd(`web-app-url(receipt-${receiptId})`)}
              part: notifications.receiptStored.part(${debtor.locale}):
                partAmount: 12 грн
          `]
        ])
    })

    it('should notify participants about updated receipts (no description)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1234

      debtsStorage.mock_storeDebts(
        {
          receiptId,
          debtorId: debtor.id,
          amount: 1200,
        },
      )

      const notification = await receiptTelegramNotifier.updated({
        payerId: payer.id,
        amount,
        description: undefined,
        hasPhoto: false,
        createdAt: new Date(),
        id: receiptId,
      }, { editorId: editor.id })

      await notification.send()

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptStored.message(${payer.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              action: notifications.receiptStored.actions.updated(${payer.locale})
              receiptDescription: notifications.receiptStored.noDescription(${payer.locale})
              receiptAmount: 12\\.34 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
              receiptUrl: ${escapeMd(`web-app-url(receipt-${receiptId})`)}
              part: ''
          `],
          [debtor.id, stripIndent`
            notifications.receiptStored.message(${debtor.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              action: notifications.receiptStored.actions.updated(${debtor.locale})
              receiptDescription: notifications.receiptStored.noDescription(${debtor.locale})
              receiptAmount: 12\\.34 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
              receiptUrl: ${escapeMd(`web-app-url(receipt-${receiptId})`)}
              part: notifications.receiptStored.part(${debtor.locale}):
                partAmount: 12 грн
          `]
        ])
    })
  })

  describe('[receipt deleted]', () => {
    it('should notify participants about deleted receipts (with description)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1200
      const description = 'Hello world!'

      debtsStorage.mock_storeDebts(
        {
          receiptId,
          debtorId: debtor.id,
          amount: 1200,
        },
      )

      const notification = await receiptTelegramNotifier.deleted({
        payerId: payer.id,
        amount,
        description,
        hasPhoto: false,
        createdAt: new Date(),
        id: receiptId,
      }, { editorId: editor.id })

      await notification.send()

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptDeleted.message(${payer.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              receiptDescription: notifications.receiptDeleted.description(${payer.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
          `],
          [debtor.id, stripIndent`
            notifications.receiptDeleted.message(${debtor.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              receiptDescription: notifications.receiptDeleted.description(${debtor.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
          `]
        ])
    })

    it('should notify participants about deleted receipts (without description)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1230

      debtsStorage.mock_storeDebts(
        {
          receiptId,
          debtorId: debtor.id,
          amount: 1200,
        },
      )

      const notification = await receiptTelegramNotifier.deleted({
        payerId: payer.id,
        amount,
        description: undefined,
        hasPhoto: false,
        createdAt: new Date(),
        id: receiptId,
      }, { editorId: editor.id })

      await notification.send()

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptDeleted.message(${payer.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              receiptDescription: notifications.receiptDeleted.noDescription(${payer.locale})
              receiptAmount: 12\\.30 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
          `],
          [debtor.id, stripIndent`
            notifications.receiptDeleted.message(${debtor.locale}):
              editorName: ${escapeMd(editor.name)}
              editorUsername: ${escapeMd(editor.username)}
              receiptDescription: notifications.receiptDeleted.noDescription(${debtor.locale})
              receiptAmount: 12\\.30 грн
              payerName: ${escapeMd(payer.name)}
              payerUsername: ${escapeMd(payer.username)}
          `]
        ])
    })
  })
})
