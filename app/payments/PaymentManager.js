export class PaymentManager {
  constructor({ paymentsStorage, paymentNotifier }) {
    this._paymentsStorage = paymentsStorage
    this._paymentNotifier = paymentNotifier
  }

  /** @param {import('./Payment').Payment} payment */
  async store(payment, { editorId }) {
    const isNew = !payment.id
    if (!isNew) {
      throw new Error('Updating payments is not currently supported')
    }

    const storedPayment = await this._paymentsStorage.create(payment)

    const notification = await this._paymentNotifier.created(storedPayment, { editorId }).catch(() => undefined)
    await notification?.send()

    return storedPayment
  }

  async delete(paymentId, { editorId }) {
    const payment = await this._paymentsStorage.findById(paymentId)
    const notification = await this._paymentNotifier.deleted(payment, { editorId }).catch(() => undefined)

    await this._paymentsStorage.deleteById(paymentId)

    await notification?.send()
  }
}
