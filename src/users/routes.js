import Router from 'express-promise-router'
import { array, nonempty, object, size, string } from 'superstruct'
import { groupIdSchema, paginationSchema } from '../common/schemas.js'
import { registry } from '../registry.js'
import { querySchema } from './schemas.js'
import { isDefined, paginationToLimitOffset } from '../common/utils.js'
import { ApiError } from '../common/errors.js'
import { MAX_DEBTS_PER_RECEIPT } from '../debts/constants.js'

const RECENT_USERS_LIMIT = 10

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

  router.get('/users', async (req, res) => {
    const { offset, limit } = paginationToLimitOffset(paginationSchema.create(req.query))

    let results
    if (searchByGroupIdSchema.is(req.query)) {
      results = await usersStorage.find({ groupIds: [req.query.group_id], limit, offset })
    } else if (searchByQuerySchema.is(req.query)) {
      results = await usersStorage.find({ query: req.query.query, limit, offset })
    } else if (searchByUserIdsSchema.is(req.query)) {
      results = await usersStorage.find({ ids: req.query.user_ids, limit, offset })
    } else {
      throw new ApiError({ code: 'INVALID_SEARCH_PARAMETERS', status: 400 })
    }

    res.json(results)
  })

  // TODO: optimize & cache this, perhaps make a single query that queries all the tables
  router.get('/recent-users', async (req, res) => {
    const receipts = await receiptsStorage.findByParticipantUserId(req.user.id)
    const debts = receipts.length > 0
      ? await debtsStorage.find({
        receiptIds: receipts.map(r => r.id),
        limit: receipts.length * MAX_DEBTS_PER_RECEIPT,
      })
      : []
    const payments = await paymentsStorage.find({ participantUserIds: [req.user.id] })
    const groups = await groupStorage.find({ memberUserIds: [req.user.id] })
    const groupUserIds = groups.items.length > 0
      ? await membershipStorage.findUserIdsByGroupIds(groups.items.map(g => g.id))
      : []

    const userIds = [
      ...receipts.map(r => r.payerId),
      ...debts.map(d => d.debtorId),
      ...payments.items.map(p => p.fromUserId),
      ...payments.items.map(p => p.toUserId),
      ...groupUserIds,
    ]

    const userIdMap = new Map()
    for (const userId of userIds) {
      if (userId === req.user.id) continue
      userIdMap.set(userId, (userIdMap.get(userId) ?? 0) + 1)
    }

    const sortedUserIds = [...userIdMap.entries()]
      .slice(0, RECENT_USERS_LIMIT)
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
