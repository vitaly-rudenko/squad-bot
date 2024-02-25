import Router from 'express-promise-router'
import { object } from 'superstruct'
import { userIdSchema, amountSchema, paginationSchema } from '../common/schemas.js'
import { sendPaymentDeletedNotification, sendPaymentSavedNotification } from './notifications.js'
import { NotAuthorizedError, NotFoundError } from '../common/errors.js'
import { registry } from '../registry.js'
import { paginationToLimitOffset } from '../common/utils.js'

export const createPaymentSchema = object({
  fromUserId: userIdSchema,
  toUserId: userIdSchema,
  amount: amountSchema,
})

export function createPaymentsRouter() {
  const { paymentsStorage } = registry.export()

  const router = Router()

  router.post('/payments', async (req, res) => {
    const { fromUserId, toUserId, amount } = createPaymentSchema.create(req.body)

    const payment = await paymentsStorage.create({
      fromUserId,
      toUserId,
      amount,
      createdAt: new Date(),
    })

    await sendPaymentSavedNotification({ action: 'create', editorId: req.user.id, payment })

    res.json(payment)
  })

  router.delete('/payments/:paymentId', async (req, res) => {
    const paymentId = req.params.paymentId
    const editorId = req.user.id

    const payment = await paymentsStorage.findById(paymentId)
    if (!payment) {
      throw new NotFoundError()
    }

    if (![payment.fromUserId, payment.toUserId].includes(editorId)) {
      throw new NotAuthorizedError()
    }

    await paymentsStorage.deleteById(paymentId)

    await sendPaymentDeletedNotification({ editorId, payment })

    res.sendStatus(204)
  })

  router.get('/payments', async (req, res) => {
    const { limit, offset } = paginationToLimitOffset(paginationSchema.create(req.query))
    const { items, total } = await paymentsStorage.find({ participantUserIds: [req.user.id], limit, offset })
    res.json({ items, total })
  })

  return router
}
