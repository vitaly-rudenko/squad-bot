import Router from 'express-promise-router'
import { array, boolean, literal, nonempty, number, object, optional, refine, size, string, trimmed, union } from 'superstruct'
import { userIdSchema, groupIdSchema } from '../common/schemas.js'
import { NotAuthorizedError, NotFoundError } from '../common/errors.js'
import { registry } from '../../registry.js'

export const sortOrderSchema = refine(number(), 'natural', (value) => Number.isInteger(value) && value > 0)
export const pollOptionsSchema = array(size(trimmed(string()), 1, 32))
export const messagePatternSchema = size(trimmed(string()), 1, 256)
export const usersPatternSchema = union([
  literal('*'),
  refine(
    nonempty(string()),
    'users pattern',
    (value) => value.split(',').every(userId => userIdSchema.is(userId))
  ),
])

export const createRollCallSchema = object({
  groupId: groupIdSchema,
  messagePattern: messagePatternSchema,
  usersPattern: usersPatternSchema,
  excludeSender: boolean(),
  pollOptions: pollOptionsSchema,
  sortOrder: sortOrderSchema,
})

export const updateRollCallSchema = object({
  messagePattern: optional(messagePatternSchema),
  usersPattern: optional(usersPatternSchema),
  excludeSender: optional(boolean()),
  pollOptions: optional(pollOptionsSchema),
  sortOrder: optional(sortOrderSchema),
})

export function createRollCallsRouter() {
  const {
    membershipStorage,
    rollCallsStorage,
  } = registry.export()

  const router = Router()

  router.post('/rollcalls', async (req, res) => {
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

  // TODO: merge with "create" request
  router.patch('/rollcalls/:rollCallId', async (req, res) => {
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

  router.get('/rollcalls', async (req, res) => {
    const groupId = groupIdSchema.create(req.query.group_id)
    const rollCalls = await rollCallsStorage.findByGroupId(groupId)
    res.json(rollCalls)
  })

  router.delete('/rollcalls/:rollCallId', async (req, res) => {
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
