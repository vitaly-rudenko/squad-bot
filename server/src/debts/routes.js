import Router from 'express-promise-router'
import { aggregateDebts } from './utils.js'
import { registry } from '../registry.js'

export function createDebtsRouter() {
  const {
    debtsStorage,
    paymentsStorage,
  } = registry.export()

  const router = Router()

  router.get('/debts', async (req, res) => {
    const { ingoingDebts, outgoingDebts } = await aggregateDebts({
      userId: req.user.id,
      debtsStorage,
      paymentsStorage,
    })

    res.json({
      ingoingDebts: ingoingDebts.map(debt => ({
        userId: debt.fromUserId,
        amount: debt.amount,
      })),
      outgoingDebts: outgoingDebts.map(debt => ({
        userId: debt.toUserId,
        amount: debt.amount,
      })),
    })
  })

  return router
}
