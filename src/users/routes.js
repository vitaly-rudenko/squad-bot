import Router from 'express-promise-router'
import { array, nonempty, object, size, string } from 'superstruct'
import { groupIdSchema } from '../common/schemas.js'
import { registry } from '../registry.js'
import { querySchema } from './schemas.js'
import { isDefined } from '../common/utils.js'
import { ApiError } from '../common/errors.js'

export function createUsersRouter() {
  const {
    usersStorage,
    membershipStorage,
    receiptsStorage,
    debtsStorage,
    paymentsStorage,
    groupStorage,
  } = registry.export()

  const router = Router()

  router.put('/users', async (req, res) => {
    await usersStorage.store(req.user)
    res.json(req.user)
  })

  const searchByGroupIdSchema = object({ group_id: groupIdSchema })
  const searchByQuerySchema = object({ query: querySchema })
  const searchByUserIdsSchema = object({ user_ids: size(array(nonempty(string())), 1, 100) })

  // TODO: hard limit to 100
  router.get('/users', async (req, res) => {
    if (searchByGroupIdSchema.is(req.query)) {
      // TODO: use a join?
      const userIds = await membershipStorage.findUserIdsByGroupId(req.query.group_id)
      const users = await usersStorage.find({ ids: userIds })
      res.json(users)
      return
    }

    if (searchByQuerySchema.is(req.query)) {
      const users = await usersStorage.find({ query: req.query.query })
      res.json(users)
      return
    }

    if (searchByUserIdsSchema.is(req.query)) {
      const users = await usersStorage.find({ ids: req.query.user_ids })
      res.json(users)
      return
    }

    throw new ApiError({ code: 'INVALID_SEARCH_PARAMETERS', status: 400 })
  })

  // TODO: optimize & cache this, perhaps make a single query that queries all the tables
  router.get('/recent-users', async (req, res) => {
    const receipts = await receiptsStorage.findByParticipantUserId(req.user.id)
    const debts = await debtsStorage.findByReceiptIds(receipts.map(r => r.id))
    const payments = await paymentsStorage.findByParticipantUserId(req.user.id)
    const groups = await groupStorage.findByMemberUserId(req.user.id)
    const groupUserIds = await membershipStorage.findUserIdsByGroupIds(groups.map(g => g.id))

    const userIds = [
      ...receipts.map(r => r.payerId),
      ...debts.map(d => d.debtorId),
      ...payments.map(p => p.fromUserId),
      ...payments.map(p => p.toUserId),
      ...groupUserIds,
    ]

    const userIdMap = new Map()
    for (const userId of userIds) {
      if (userId === req.user.id) continue
      userIdMap.set(userId, (userIdMap.get(userId) ?? 0) + 1)
    }

    const sortedUserIds = [...userIdMap.entries()]
      .slice(0, 10)
      .sort((a, b) => b.at(1) - a.at(1))
      .map(([userId]) => userId)

    const users = await usersStorage.find({ ids: sortedUserIds })

    res.json(
      sortedUserIds
        .map(userId => users.find(u => u.id === userId))
        .filter(isDefined)
    )
  })

  return router
}
