import Router from 'express-promise-router'
import { literal, object, refine, size, string, trimmed, union } from 'superstruct'
import { userIdSchema } from '../common/schemas.js'

const cardNumberRegex = /^[0-9]+$/
export const createCardSchema = object({
  number: refine(size(trimmed(string()), 16), 'numeric', (value) => cardNumberRegex.test(value)),
  bank: union([literal('privatbank'), literal('monobank')]),
})

/**
 * @param {{
 *   cardsStorage: import('./storage.js').CardsPostgresStorage,
 * }} input
 */
export function createCardsRouter({
  cardsStorage,
}) {
  const router = Router()

  router.get('/cards', async (req, res) => {
    const userId = userIdSchema.create(req.query.user_id)
    const cards = await cardsStorage.findByUserId(userId)
    res.json(cards)
  })

  router.post('/cards', async (req, res) => {
    const { number, bank } = createCardSchema.create(req.body)

    await cardsStorage.create({
      userId: req.user.id,
      bank,
      number,
    })

    res.sendStatus(201)
  })

  router.delete('/cards/:cardId', async (req, res) => {
    const cardId = Number(req.params.cardId)
    if (!Number.isInteger(cardId)) {
      res.sendStatus(400)
      return
    }

    await cardsStorage.delete(req.user.id, cardId)

    res.sendStatus(204)
  })

  return router
}
