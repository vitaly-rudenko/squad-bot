import Router from 'express-promise-router'

/**
 * @param {{
 *   debtManager: import('../debts/DebtManager.js').DebtManager,
 * }} input
 */
export function createRouter({
  debtManager,
}) {
  const router = Router()

  router.get('/debts', async (req, res) => {
    const { ingoingDebts, outgoingDebts } = await debtManager.aggregateByUserId(req.user.id)

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
