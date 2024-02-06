import Router from 'express-promise-router'
import { User } from '../users/User.js'
import { optional } from 'superstruct'
import { groupIdSchema } from '../schemas/common.js'

/**
 * @param {{
 *   membershipStorage: import('../memberships/MembershipPostgresStorage.js').MembershipPostgresStorage,
 *   usersStorage: import('../users/UsersPostgresStorage.js').UsersPostgresStorage,
 * }} input
 */
export function createRouter({
  usersStorage,
  membershipStorage,
}) {
  const router = Router()

  router.post('/users', async (req, res) => {
    const { id, username, name } = req.user

    try {
      const user = new User({ id, name, username })
      await usersStorage.create(user)

      res.json({
        id: user.id,
        name: user.name,
        username: user.username,
      })
    } catch (error) {
      res.sendStatus(409)
    }
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
