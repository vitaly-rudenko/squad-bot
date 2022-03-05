import chai, { expect } from 'chai'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { spy } from 'sinon'
import { Debt } from '../../../app/debts/Debt.js'
import { ReceiptTelegramNotifier } from '../../../app/receipts/notifications/ReceiptTelegramNotifier.js'
import { stripIndent } from 'common-tags'
import { localizeMock } from '../../helpers/localizeMock.js'
import { UsersMockStorage } from '../../helpers/UsersMockStorage.js'
import { createUser } from '../../helpers/createUser.js'

chai.use(deepEqualInAnyOrder)

describe('ReceiptTelegramNotifier', () => {
  /** @type {ReceiptTelegramNotifier} */
  let receiptTelegramNotifier
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

    receiptTelegramNotifier = new ReceiptTelegramNotifier({
      telegramNotifier,
      usersStorage,
      localize: localizeMock,
      logger,
    })
  })

  describe('[receipt created]', () => {
    it('should notify participants about new receipts (description + complete receipt)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1200
      const description = 'Hello world!'
      const debts = [
        new Debt({
          receiptId,
          debtorId: debtor.id,
          amount: 1200,
        }),
      ]

      await receiptTelegramNotifier.created({
        payerId: payer.id,
        amount,
        description,
        debts,
      }, { editorId: editor.id })

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptStored.message(${payer.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              action: notifications.receiptStored.actions.added(${payer.locale})
              receiptDescription: notifications.receiptStored.description(${payer.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
              debt: ''
          `],
          [debtor.id, stripIndent`
            notifications.receiptStored.message(${debtor.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              action: notifications.receiptStored.actions.added(${debtor.locale})
              receiptDescription: notifications.receiptStored.description(${debtor.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
              debt: notifications.receiptStored.debt.new(${debtor.locale}):
                debtAmount: 12 грн
          `]
        ])
    })

    it('should notify participants about new receipts (no description + incomplete receipt)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1230
      const debts = [
        new Debt({
          receiptId,
          debtorId: debtor.id,
          amount: null,
        }),
      ]

      await receiptTelegramNotifier.created({
        payerId: payer.id,
        amount,
        description: null,
        debts,
      }, { editorId: editor.id })

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptStored.message(${payer.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              action: notifications.receiptStored.actions.added(${payer.locale})
              receiptDescription: notifications.receiptStored.noDescription(${payer.locale})
              receiptAmount: 12\\.30 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
              debt: ''
          `],
          [debtor.id, stripIndent`
            notifications.receiptStored.message(${debtor.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              action: notifications.receiptStored.actions.added(${debtor.locale})
              receiptDescription: notifications.receiptStored.noDescription(${debtor.locale})
              receiptAmount: 12\\.30 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
              debt: notifications.receiptStored.debt.new(${debtor.locale}):
                debtAmount: \\? грн
          `]
        ])
    })
  })

  describe('[receipt updated]', () => {
    it('should notify participants about updated receipts (description + complete receipt)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1200
      const description = 'Hello world!'
      const debts = [
        new Debt({
          receiptId,
          debtorId: debtor.id,
          amount: 1200,
        }),
      ]

      await receiptTelegramNotifier.updated({
        payerId: payer.id,
        amount,
        description,
        debts,
      }, { editorId: editor.id })

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptStored.message(${payer.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              action: notifications.receiptStored.actions.updated(${payer.locale})
              receiptDescription: notifications.receiptStored.description(${payer.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
              debt: ''
          `],
          [debtor.id, stripIndent`
            notifications.receiptStored.message(${debtor.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              action: notifications.receiptStored.actions.updated(${debtor.locale})
              receiptDescription: notifications.receiptStored.description(${debtor.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
              debt: ''
          `]
        ])
    })

    it('should notify participants about updated receipts (no description + incomplete receipt)', async () => {
      const editor = createUser()
      const payer = createUser()
      const debtor = createUser()

      usersStorage.mock_storeUsers(editor, payer, debtor)

      const receiptId = 'fake-receipt-id'
      const amount = 1234
      const debts = [
        new Debt({
          receiptId,
          debtorId: debtor.id,
          amount: null,
        }),
      ]

      await receiptTelegramNotifier.updated({
        payerId: payer.id,
        amount,
        description: null,
        debts,
      }, { editorId: editor.id })

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptStored.message(${payer.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              action: notifications.receiptStored.actions.updated(${payer.locale})
              receiptDescription: notifications.receiptStored.noDescription(${payer.locale})
              receiptAmount: 12\\.34 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
              debt: ''
          `],
          [debtor.id, stripIndent`
            notifications.receiptStored.message(${debtor.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              action: notifications.receiptStored.actions.updated(${debtor.locale})
              receiptDescription: notifications.receiptStored.noDescription(${debtor.locale})
              receiptAmount: 12\\.34 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
              debt: notifications.receiptStored.debt.incomplete(${debtor.locale}):
                debtAmount: \\? грн
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
      const debts = [
        new Debt({
          receiptId,
          debtorId: debtor.id,
          amount: 1200,
        }),
      ]

      await receiptTelegramNotifier.deleted({
        payerId: payer.id,
        amount,
        description,
        debts,
      }, { editorId: editor.id })

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptDeleted.message(${payer.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              receiptDescription: notifications.receiptDeleted.description(${payer.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
          `],
          [debtor.id, stripIndent`
            notifications.receiptDeleted.message(${debtor.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              receiptDescription: notifications.receiptDeleted.description(${debtor.locale}):
                description: Hello world\\!
              receiptAmount: 12 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
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
      const description = 'Hello world!'
      const debts = [
        new Debt({
          receiptId,
          debtorId: debtor.id,
          amount: null,
        }),
      ]

      await receiptTelegramNotifier.deleted({
        payerId: payer.id,
        amount,
        description: null,
        debts,
      }, { editorId: editor.id })

      expect(telegramNotifier.notify.args)
        .to.deep.equalInAnyOrder([
          [payer.id, stripIndent`
            notifications.receiptDeleted.message(${payer.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              receiptDescription: notifications.receiptDeleted.noDescription(${payer.locale})
              receiptAmount: 12\\.30 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
          `],
          [debtor.id, stripIndent`
            notifications.receiptDeleted.message(${debtor.locale}):
              editorName: ${editor.name}
              editorUsername: ${editor.username}
              receiptDescription: notifications.receiptDeleted.noDescription(${debtor.locale})
              receiptAmount: 12\\.30 грн
              payerName: ${payer.name}
              payerUsername: ${payer.username}
          `]
        ])
    })
  })
})
