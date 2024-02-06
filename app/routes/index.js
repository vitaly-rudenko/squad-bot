import Router from 'express-promise-router'
import { Group } from '../groups/Group.js'
import { nonempty, object, string, trimmed } from 'superstruct'
import * as users from './users.js'
import * as receipts from './receipts.js'
import * as groups from './groups.js'
import { groupIdSchema, userIdSchema } from '../features/common/schemas.js'
import { createCardsRouter } from '../features/cards/routes.js'
import { createRollCallsRouter } from '../features/roll-calls/routes.js'
import { createAuthMiddleware, createAuthRouter } from '../features/auth/routes.js'
import { createAdminsRouter } from '../features/admins/routes.js'
import { createDebtsRouter } from '../features/debts/routes.js'
import { createPaymentsRouter } from '../features/payments/routes.js'

export const createMembershipSchema = object({
  userId: userIdSchema,
  groupId: groupIdSchema,
  title: nonempty(trimmed(string())),
})

/**
 * @param {{
 *   botInfo: Awaited<ReturnType<import('telegraf').Telegram['getMe']>>
 *   cardsStorage: import('../features/cards/storage.js').CardsPostgresStorage
 *   createRedisCache: ReturnType<import('../utils/createRedisCacheFactory.js').createRedisCacheFactory>
 *   debtsStorage: import('../features/debts/storage.js').DebtsPostgresStorage
 *   groupManager: import('../groups/GroupManager.js').GroupManager
 *   groupStorage: import('../groups/GroupPostgresStorage.js').GroupsPostgresStorage
 *   localize: import('../localization/localize.js').localize
 *   membershipManager: import('../memberships/MembershipManager.js').MembershipManager
 *   membershipStorage: import('../memberships/MembershipPostgresStorage.js').MembershipPostgresStorage
 *   paymentsStorage: import('../features/payments/storage.js').PaymentsPostgresStorage
 *   receiptManager: import('../receipts/ReceiptManager.js').ReceiptManager
 *   receiptsStorage: import('../receipts/ReceiptsPostgresStorage.js').ReceiptsPostgresStorage
 *   rollCallsStorage: import('../features/roll-calls/storage.js').RollCallsPostgresStorage
 *   telegram: import('telegraf').Telegram
 *   telegramBotToken: string
 *   tokenSecret: string
 *   usersStorage: import('../users/UsersPostgresStorage.js').UsersPostgresStorage
 *   useTestMode: boolean
 * }} input
 */
export function createRouter({
  botInfo,
  cardsStorage,
  createRedisCache,
  debtsStorage,
  groupManager,
  groupStorage,
  localize,
  membershipManager,
  membershipStorage,
  paymentsStorage,
  receiptManager,
  receiptsStorage,
  rollCallsStorage,
  telegram,
  telegramBotToken,
  tokenSecret,
  usersStorage,
  useTestMode,
}) {
  const router = Router()

  const botResponse = {
    id: String(botInfo.id),
    name: botInfo.first_name,
    username: botInfo.username,
  }

  router.get('/bot', async (_, res) => res.json(botResponse))

  router.use(
    createAuthRouter({
      createRedisCache,
      telegramBotToken,
      tokenSecret,
      usersStorage,
      useTestMode,
    })
  )

  router.use(receipts.createPublicRouter({ receiptsStorage }))

  if (useTestMode) {
    router.post('/memberships', async (req, res) => {
      const { userId, groupId, title } = createMembershipSchema.create(req.body)

      await membershipManager.hardLink(userId, groupId)
      await groupManager.store(
        new Group({
          id: groupId,
          title,
        })
      )

      res.sendStatus(200)
    })
  }

  router.use(createAuthMiddleware({ tokenSecret }))

  router.use(
    users.createRouter({ usersStorage, membershipStorage }),
    receipts.createRouter({
      debtsStorage,
      receiptManager,
      receiptsStorage,
    }),
    createPaymentsRouter({
      localize,
      paymentsStorage,
      telegram,
      usersStorage,
    }),
    createDebtsRouter({
      debtsStorage,
      paymentsStorage,
    }),
    createRollCallsRouter({
      membershipManager,
      rollCallsStorage,
    }),
    groups.createRouter({
      groupStorage,
    }),
    createAdminsRouter({
      botInfo,
      membershipManager,
      telegram,
    }),
    createCardsRouter({
      cardsStorage,
    }),
  )

  return router
}
