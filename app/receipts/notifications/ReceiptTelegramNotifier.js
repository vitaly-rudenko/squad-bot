import { renderAmount, renderUser } from '../../features/common/utils.js'
import { renderDebtAmount } from '../../features/debts/utils.js'
import { escapeMd } from '../../utils/escapeMd.js'

export class ReceiptTelegramNotifier {
  /**
   * @param {{
   *   massTelegramNotificationFactory: import('../../shared/notifications/MassTelegramNotification.js').MassTelegramNotificationFactory,
   *   usersStorage: import('../../users/UsersPostgresStorage.js').UsersPostgresStorage,
   *   debtsStorage: import('../../features/debts/storage.js').DebtsPostgresStorage,
   *   localize: import('../../features/localization/localize.js').localize,
   *   generateWebAppUrl: any,
   * }} input
   */
  constructor({ massTelegramNotificationFactory, usersStorage, debtsStorage, localize, generateWebAppUrl }) {
    this._usersStorage = usersStorage
    this._debtsStorage = debtsStorage
    this._massTelegramNotificationFactory = massTelegramNotificationFactory
    this._localize = localize
    this._generateWebAppUrl = generateWebAppUrl
  }

  /** @param {import('../Receipt.js').Receipt} receipt */
  async deleted(receipt, { editorId }) {
    const { payerId, description, amount } = receipt
    const debts = await this._debtsStorage.findByReceiptId(receipt.id)

    const editor = await this._usersStorage.findById(editorId)
    const payer = await this._usersStorage.findById(payerId)
    const userIds = [...new Set([payerId, ...debts.map(debt => debt.debtorId)])]
    const users = await this._usersStorage.findByIds(userIds)

    const massNotification = this._massTelegramNotificationFactory.create()

    for (const user of users) {
      const notification = this._localize(user.locale, 'receipts.notifications.deleted.message', {
        amount: escapeMd(renderAmount(amount)),
        editor: escapeMd(renderUser(editor)),
        payer: escapeMd(renderUser(payer)),
        description: description
          ? this._localize(
            user.locale,
            'receipts.notifications.deleted.description',
            { description: escapeMd(description) },
          )
          : '',
      })

      massNotification.add(user.id, notification)
    }

    return massNotification
  }

  /** @param {import('../Receipt.js').Receipt} receipt */
  async created(receipt, { editorId }) {
    return this._stored(receipt, { editorId, isNew: true })
  }

  /** @param {import('../Receipt.js').Receipt} receipt */
  async updated(receipt, { editorId }) {
    return this._stored(receipt, { editorId, isNew: false })
  }

  /** @param {import('../Receipt.js').Receipt} receipt */
  async _stored(receipt, { editorId, isNew }) {
    const { payerId, amount, description } = receipt
    const receiptUrl = this._generateWebAppUrl(`receipt-${receipt.id}`)
    const debts = await this._debtsStorage.findByReceiptId(receipt.id)

    const editor = await this._usersStorage.findById(editorId)
    const payer = await this._usersStorage.findById(payerId)
    const userIds = [...new Set([payerId, ...debts.map(debt => debt.debtorId)])]
    const users = await this._usersStorage.findByIds(userIds)

    const massNotification = this._massTelegramNotificationFactory.create()

    for (const user of users) {
      const debt = debts.find(debt => debt.debtorId === user.id)

      const notification = this._localize(user.locale, 'receipts.notifications.saved.message', {
        editor: escapeMd(renderUser(editor)),
        payer: escapeMd(renderUser(payer)),
        action: this._localize(
          user.locale,
          isNew
            ? 'receipts.notifications.saved.action.create'
            : 'receipts.notifications.saved.action.update',
        ),
        description: description
          ? this._localize(
            user.locale,
            'receipts.notifications.saved.description',
            { description: escapeMd(description) },
          )
          : '',
        amount: escapeMd(renderAmount(amount)),
        receiptUrl: escapeMd(receiptUrl),
        part: debt ? this._localize(
          user.locale,
          'receipts.notifications.saved.part',
          { amount: escapeMd(renderDebtAmount(debt)) },
        ) : '',
      })

      massNotification.add(user.id, notification)
    }

    return massNotification
  }
}