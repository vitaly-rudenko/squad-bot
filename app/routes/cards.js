import Router from 'express-promise-router'
import { Card } from '../cards/Card.js'
import { formatCardNumber } from '../utils/formatCardNumber.js'
import { literal, nonempty, object, refine, size, string, union } from 'superstruct'

/**
 * @param {{
 *   cardsStorage: import('../cards/CardsPostgresStorage.js').CardsPostgresStorage,
 * }} input
 */
export function createRouter({
  cardsStorage,
}) {
  const router = Router()

  const userIdSchema = nonempty(string())

  router.get('/cards', async (req, res) => {
    const userId = userIdSchema.create(req.query.user_id)
    const cards = await cardsStorage.findByUserId(userId)
    res.json(cards)
  })

  const numberRegex = /^[0-9]+$/
  const createCardSchema = object({
    number: refine(size(string(), 16), 'numeric', (value) => numberRegex.test(value)),
    bank: union([literal('privatbank'), literal('monobank')]),
  })

  router.post('/cards', async (req, res) => {
    const { number, bank } = createCardSchema.create(req.body)

    await cardsStorage.create(
      new Card({
        userId: req.user.id,
        bank,
        number: formatCardNumber(number),
      })
    )

    res.sendStatus(200)
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
