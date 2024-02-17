import Router from 'express-promise-router'
import { groupIdSchema } from '../common/schemas.js'
import { NotAuthorizedError, NotFoundError } from '../common/errors.js'
import { registry } from '../registry.js'
import { createRollCallSchema, updateRollCallSchema } from './schemas.js'

export function createRollCallsRouter() {
  const {
    membershipStorage,
    rollCallsStorage,
  } = registry.export()

  const router = Router()

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

  // TODO: hard limit to 100
  router.get('/roll-calls', async (req, res) => {
    const groupId = groupIdSchema.create(req.query.group_id)
    const rollCalls = await rollCallsStorage.findByGroupId(groupId)
    res.json(rollCalls)
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
