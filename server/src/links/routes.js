import Router from 'express-promise-router'
import { registry } from '../registry.js'
import { createLinkSchema, updateLinkSchema } from './schemas.js'
import { NotAuthorizedError, NotFoundError } from '../common/errors.js'
import { paginationToLimitOffset } from '../common/utils.js'
import { groupIdSchema, paginationSchema } from '../common/schemas.js'

export function createLinksRouter() {
  const { linksStorage, membershipStorage } = registry.export()

  const router = Router()

  // TODO: limit amount of links per group
  router.post('/links', async (req, res) => {
    const { groupId, label, url } = createLinkSchema.create(req.body)

    if (!(await membershipStorage.exists(req.user.id, groupId))) {
      throw new NotAuthorizedError()
    }

    res.json(
      await linksStorage.create({
        groupId,
        label,
        url,
      }),
    )
  })

  router.patch('/links/:linkId', async (req, res) => {
    const linkId = Number(req.params.linkId)

    const link = await linksStorage.findById(linkId)
    if (!link) {
      throw new NotFoundError()
    }

    const { label, url } = updateLinkSchema.create(req.body)

    if (!(await membershipStorage.exists(req.user.id, link.groupId))) {
      throw new NotAuthorizedError()
    }

    await linksStorage.update({
      id: linkId,
      label,
      url,
    })

    res.sendStatus(201)
  })

  router.get('/links', async (req, res) => {
    const { limit, offset } = paginationToLimitOffset(paginationSchema.create(req.query))
    const groupId = groupIdSchema.create(req.query.group_id)

    const { items, total } = await linksStorage.find({ groupIds: [groupId], limit, offset })
    res.json({ items, total })
  })

  router.get('/links/:linkId', async (req, res) => {
    const linkId = Number(req.params.linkId)

    const link = await linksStorage.findById(linkId)
    if (!link) {
      throw new NotFoundError()
    }

    if (!(await membershipStorage.exists(req.user.id, link.groupId))) {
      throw new NotAuthorizedError()
    }

    res.json(link)
  })

  router.delete('/links/:linkId', async (req, res) => {
    const linkId = Number(req.params.linkId)

    const link = await linksStorage.findById(linkId)
    if (!link) {
      throw new NotFoundError()
    }

    if (!(await membershipStorage.exists(req.user.id, link.groupId))) {
      throw new NotAuthorizedError()
    }

    await linksStorage.deleteById(linkId)
    res.sendStatus(204)
  })

  return router
}
