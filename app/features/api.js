import Router from 'express-promise-router'
import { nonempty, object, string, trimmed } from 'superstruct'
import { groupIdSchema, userIdSchema } from './common/schemas.js'
import { createCardsRouter } from './cards/routes.js'
import { createRollCallsRouter } from './roll-calls/routes.js'
import { createAuthMiddleware, createAuthRouter } from './auth/routes.js'
import { createAdminsRouter } from './admins/routes.js'
import { createDebtsRouter } from './debts/routes.js'
import { createPaymentsRouter } from './payments/routes.js'
import { createGroupsRouter } from './groups/routes.js'
import { createUsersRouter } from './users/routes.js'
import { registry } from './registry.js'
import { createPublicReceiptsRouter, createReceiptsRouter } from './receipts/routes.js'

export const createMembershipSchema = object({
  userId: userIdSchema,
  groupId: groupIdSchema,
  title: nonempty(trimmed(string())),
})

export function createApiRouter() {
  const {
    botInfo,
    groupStorage,
    membershipStorage,
    tokenSecret,
    useTestMode,
  } = registry.export()

  const router = Router()

  const botResponse = {
    id: String(botInfo.id),
    name: botInfo.first_name,
    username: botInfo.username,
  }

  router.get('/bot', async (_, res) => res.json(botResponse))

  router.use(createAuthRouter())

  router.use(createPublicReceiptsRouter())

  if (useTestMode) {
    router.post('/memberships', async (req, res) => {
      const { userId, groupId, title } = createMembershipSchema.create(req.body)

      await groupStorage.store({
        id: groupId,
        title,
      })

      await membershipStorage.store(userId, groupId)

      res.sendStatus(200)
    })
  }

  router.use(createAuthMiddleware({ tokenSecret }))

  router.use(
    createUsersRouter(),
    createDebtsRouter(),
    createReceiptsRouter(),
    createPaymentsRouter(),
    createDebtsRouter(),
    createRollCallsRouter(),
    createGroupsRouter(),
    createAdminsRouter(),
    createCardsRouter(),
  )

  return router
}
