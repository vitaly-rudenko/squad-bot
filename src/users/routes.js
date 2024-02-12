import Router from 'express-promise-router'
import { optional } from 'superstruct'
import { groupIdSchema } from '../common/schemas.js'
import { registry } from '../registry.js'
import { querySchema } from './schemas.js'

export function createUsersRouter() {
  const {
    usersStorage,
    membershipStorage,
  } = registry.export()

  const router = Router()

  router.put('/users', async (req, res) => {
    await usersStorage.store(req.user)
    res.json(req.user)
  })

  // TODO: hard limit to 100
  router.get('/users', async (req, res) => {
    const query = optional(querySchema).create(req.query.query)

    const groupId = optional(groupIdSchema).create(req.query.group_id)
    if (groupId) {
      // TODO: use a join
      const userIds = await membershipStorage.findUserIdsByGroupId(groupId)
      const users = await usersStorage.find({ ids: userIds, query })
      res.json(users)
      return
    }

    const users = await usersStorage.find({ query, allowDeprecatedNoConditions: true })
    res.json(users)
  })

  return router
}
