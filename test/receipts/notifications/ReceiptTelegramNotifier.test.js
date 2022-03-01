import chai, { expect } from 'chai'
import { Chance } from 'chance'
import deepEqualInAnyOrder from 'deep-equal-in-any-order'
import { spy } from 'sinon'
import { Debt } from '../../../app/debts/Debt.js'
import { ReceiptTelegramNotifier } from '../../../app/receipts/notifications/ReceiptTelegramNotifier.js'
import { User } from '../../../app/users/User.js'
import { stripIndent } from 'common-tags'
import { localizeMock } from '../../helpers/localize.mock.js'

chai.use(deepEqualInAnyOrder)

class UsersMockStorage {
  constructor() {
    this._users = new Map()
  }

  mock_storeUsers(...users) {
    for (const user of users) {
      this._users.set(user.id, user)
    }
  }

  findById(userId) {
    return this._users.get(userId) || null
  }

  findByIds(userIds) {
    const users = []

    for (const userId of userIds) {
      if (this._users.has(userId)) {
        users.push(this._users.get(userId))
      }
    }

    return users
  }
}

const chance = new Chance()

function createUser() {
  return new User({
    id: chance.guid(),
    name: chance.name(),
    username: chance.name(),
    isComplete: true,
    locale: chance.locale(),
  })
}

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

      await receiptTelegramNotifier.receiptCreated({
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

      await receiptTelegramNotifier.receiptCreated({
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

      await receiptTelegramNotifier.receiptUpdated({
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

      await receiptTelegramNotifier.receiptUpdated({
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
})
