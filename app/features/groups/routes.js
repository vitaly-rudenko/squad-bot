import Router from 'express-promise-router'
import { registry } from '../registry.js'

export function createGroupsRouter() {
  const { groupStorage } = registry.export()

  const router = Router()

  router.get('/groups', async (req, res) => {
    res.json(
      await groupStorage.findByMemberUserId(req.user.id)
    )
  })

  return router
}
