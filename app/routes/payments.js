import Router from 'express-promise-router'
import { Payment } from '../payments/Payment.js'
import { object } from 'superstruct'
import { amountSchema, userIdSchema } from '../features/common/schemas.js'

export const createPaymentSchema = object({
  fromUserId: userIdSchema,
  toUserId: userIdSchema,
  amount: amountSchema,
})

/**
 * @param {{
 *   paymentManager: import('../payments/PaymentManager.js').PaymentManager,
 *   paymentsStorage: import('../payments/PaymentsPostgresStorage.js').PaymentsPostgresStorage,
 * }} input
 */
export function createRouter({
  paymentManager,
  paymentsStorage,
}) {
  const router = Router()

  router.post('/payments', async (req, res) => {
    const { fromUserId, toUserId, amount } = createPaymentSchema.create(req.body)
    const payment = new Payment({ fromUserId, toUserId, amount })
    const storedPayment = await paymentManager.store(payment, { editorId: req.user.id })
    res.json(storedPayment)
  })

  router.delete('/payments/:paymentId', async (req, res) => {
    const paymentId = req.params.paymentId
    await paymentManager.delete(paymentId, { editorId: req.user.id })
    res.sendStatus(204)
  })

  router.get('/payments', async (req, res) => {
    const payments = await paymentsStorage.findByParticipantUserId(req.user.id)
    res.json(payments)
  })

  return router
}
