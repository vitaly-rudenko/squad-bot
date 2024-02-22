import Router from 'express-promise-router'
import { groupIdSchema, paginationSchema } from '../common/schemas.js'
import { NotAuthorizedError, NotFoundError } from '../common/errors.js'
import { registry } from '../registry.js'
import { createRollCallSchema, updateRollCallSchema } from './schemas.js'
import { paginationToLimitOffset } from '../common/utils.js'

export function createRollCallsRouter() {
  const {
    membershipStorage,
    rollCallsStorage,
  } = registry.export()

  const router = Router()

  // TODO: limit amount of roll calls per group
  router.post('/roll-calls', async (req, res) => {
    const {
      groupId,
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
      sortOrder,
    } = createRollCallSchema.create(req.body)

    if (!(await membershipStorage.exists(req.user.id, groupId))) {
      throw new NotAuthorizedError()
    }

    res.json(
      await rollCallsStorage.create({
        groupId,
        excludeSender,
        messagePattern,
        usersPattern,
        pollOptions,
        sortOrder,
      })
    )
  })

  router.patch('/roll-calls/:rollCallId', async (req, res) => {
    const rollCallId = req.params.rollCallId

    const rollCall = await rollCallsStorage.findById(rollCallId)
    if (!rollCall) {
      throw new NotFoundError()
    }

    const {
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
      sortOrder,
    } = updateRollCallSchema.create(req.body)

    if (!(await membershipStorage.exists(req.user.id, rollCall.groupId))) {
      throw new NotAuthorizedError()
    }

    await rollCallsStorage.update({
      id: rollCallId,
      excludeSender,
      messagePattern,
      usersPattern,
      pollOptions,
      sortOrder,
    })

    res.sendStatus(201)
  })

  router.get('/roll-calls', async (req, res) => {
    const { limit, offset } = paginationToLimitOffset(paginationSchema.create(req.query))
    const groupId = groupIdSchema.create(req.query.group_id)

    const { items, total } = await rollCallsStorage.find({ groupIds: [groupId], limit, offset })
    res.json({ items, total })
  })

  router.delete('/roll-calls/:rollCallId', async (req, res) => {
    const rollCall = await rollCallsStorage.findById(req.params.rollCallId)
    if (!rollCall) {
      throw new NotFoundError()
    }

    if (!(await membershipStorage.exists(req.user.id, rollCall.groupId))) {
      throw new NotAuthorizedError()
    }

    await rollCallsStorage.deleteById(req.params.rollCallId)
    res.sendStatus(204)
  })

  return router
}
