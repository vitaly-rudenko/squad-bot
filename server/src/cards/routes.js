import Router from 'express-promise-router'
import { literal, object, refine, size, string, trimmed, union } from 'superstruct'
import { paginationSchema, userIdSchema } from '../common/schemas.js'
import { registry } from '../registry.js'
import { paginationToLimitOffset } from '../common/utils.js'

const cardNumberRegex = /^[0-9]+$/
export const createCardSchema = object({
  number: refine(size(trimmed(string()), 16), 'numeric', (value) => cardNumberRegex.test(value)),
  bank: union([literal('privatbank'), literal('monobank')]),
})

export function createCardsRouter() {
  const { cardsStorage } = registry.export()

  const router = Router()

  router.get('/cards', async (req, res) => {
    const { limit, offset } = paginationToLimitOffset(paginationSchema.create(req.query))
    const userId = userIdSchema.create(req.query.user_id)

    const { total, items } = await cardsStorage.find({ userIds: [userId], limit, offset })
    res.json({ total, items })
  })

  router.post('/cards', async (req, res) => {
    const { number, bank } = createCardSchema.create(req.body)

    res.json(
      await cardsStorage.create({
        userId: req.user.id,
        bank,
        number,
      })
    )
  })

  router.delete('/cards/:cardId', async (req, res) => {
    await cardsStorage.delete(req.user.id, req.params.cardId)

    res.sendStatus(204)
  })

  return router
}
