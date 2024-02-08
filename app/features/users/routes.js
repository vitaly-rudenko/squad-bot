import Router from 'express-promise-router'
import { optional } from 'superstruct'
import { groupIdSchema } from '../common/schemas.js'

/**
 * @param {{
 *   membershipStorage: import('../../memberships/MembershipPostgresStorage.js').MembershipPostgresStorage,
 *   usersStorage: import('./storage.js').UsersPostgresStorage,
 * }} input
 */
export function createUsersRouter({
  usersStorage,
  membershipStorage,
}) {
  const router = Router()

  router.put('/users', async (req, res) => {
    await usersStorage.store(req.user)
    res.json(req.user)
  })

  router.get('/users', async (req, res) => {
    const groupId = optional(groupIdSchema).create(req.query.group_id)
    if (groupId) {
      const userIds = await membershipStorage.findUserIdsByGroupId(groupId)
      const users = await usersStorage.findByIds(userIds)
      res.json(users)
      return
    }

    const users = await usersStorage.findAll()
    res.json(users)
  })

  return router
}
