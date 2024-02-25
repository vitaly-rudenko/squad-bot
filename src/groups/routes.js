import Router from 'express-promise-router'
import { registry } from '../registry.js'
import { paginationSchema } from '../common/schemas.js'
import { paginationToLimitOffset } from '../common/utils.js'
import { NotFoundError } from '../common/errors.js'

export function createGroupsRouter() {
  const { groupStorage } = registry.export()

  const router = Router()

  router.get('/groups', async (req, res) => {
    const { limit, offset } = paginationToLimitOffset(paginationSchema.create(req.query))

    const { total, items } = await groupStorage.find({ memberUserIds: [req.user.id], limit, offset })
    res.json({ total, items })
  })

  router.get('/groups/:groupId', async (req, res) => {
    const group = await groupStorage.findById(req.params.groupId)
    if (!group) {
      throw new NotFoundError()
    }

    res.json(group)
  })

  return router
}
