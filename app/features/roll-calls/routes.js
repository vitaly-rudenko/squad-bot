import Router from 'express-promise-router'
import { array, boolean, literal, nonempty, number, object, optional, refine, size, string, trimmed, union } from 'superstruct'
import { AlreadyExistsError } from '../../errors/AlreadyExistsError.js'
import { userIdSchema, groupIdSchema } from '../common/schemas.js'

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

/**
 * @param {{
 *   membershipManager: import('../../memberships/MembershipManager.js').MembershipManager,
 *   rollCallsStorage: import('./storage.js').RollCallsPostgresStorage,
 * }} input
 */
export function createRollCallsRouter({
  membershipManager,
  rollCallsStorage,
}) {
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

    if (!(await membershipManager.isHardLinked(req.user.id, groupId))) {
      res.sendStatus(403)
      return
    }

    try {
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
    } catch (error) {
      if (error instanceof AlreadyExistsError) {
        res.sendStatus(409)
      } else {
        throw error
      }
    }
  })

  // TODO: merge with "create" request
  router.patch('/rollcalls/:rollCallId', async (req, res) => {
    const rollCallId = req.params.rollCallId

    const rollCall = await rollCallsStorage.findById(rollCallId)
    if (!rollCall) {
      res.sendStatus(404)
      return
    }

    const {
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
      sortOrder,
    } = updateRollCallSchema.create(req.body)

    if (!(await membershipManager.isHardLinked(req.user.id, rollCall.groupId))) {
      res.sendStatus(403)
      return
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
      res.sendStatus(404)
      return
    }

    if (!(await membershipManager.isHardLinked(req.user.id, rollCall.groupId))) {
      res.sendStatus(403)
      return
    }

    await rollCallsStorage.deleteById(req.params.rollCallId)
    res.sendStatus(204)
  })

  return router
}
