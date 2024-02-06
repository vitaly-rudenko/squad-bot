import Router from 'express-promise-router'
import { RollCall } from '../rollcalls/RollCall.js'
import { AlreadyExistsError } from '../errors/AlreadyExistsError.js'
import { array, boolean, literal, nonempty, number, object, optional, refine, size, string, union } from 'superstruct'
import { groupIdSchema } from '../schemas/common.js'

/**
 * @param {{
 *   membershipManager: import('../memberships/MembershipManager.js').MembershipManager,
 *   rollCallsStorage: import('../rollcalls/RollCallsPostgresStorage.js').RollCallsPostgresStorage,
 * }} input
 */
export function createRouter({
  membershipManager,
  rollCallsStorage,
}) {
  const router = Router()

  const sortOrder = refine(number(), 'natural', (value) => Number.isInteger(value) && value > 0)
  const pollOptions = array(size(string(), 1, 32))
  const userIdRegex = /^[0-9]+$/
  const usersPattern = union([
    literal('*'),
    refine(
      nonempty(string()),
      'users pattern',
      (value) => value.split(',').every(userId => userIdRegex.test(userId))
    ),
  ])

  const createRollCallSchema = object({
    groupId: groupIdSchema,
    messagePattern: size(string(), 1, 256),
    usersPattern,
    excludeSender: boolean(),
    pollOptions,
    sortOrder,
  })

  router.post('/rollcalls', async (req, res, next) => {
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
      const storedRollCall = await rollCallsStorage.create(
        new RollCall({
          groupId,
          excludeSender,
          messagePattern,
          usersPattern,
          pollOptions,
          sortOrder,
        })
      )

      res.json(storedRollCall)
    } catch (error) {
      if (error instanceof AlreadyExistsError) {
        res.sendStatus(409)
      } else {
        next(error)
      }
    }
  })

  const updateRollCallSchema = object({
    messagePattern: optional(nonempty(string())),
    usersPattern: optional(usersPattern),
    excludeSender: optional(boolean()),
    pollOptions: optional(pollOptions),
    sortOrder: optional(sortOrder),
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

    const updatedRollCall = await rollCallsStorage.update(
      rollCallId,
      {
        excludeSender,
        messagePattern,
        usersPattern,
        pollOptions,
        sortOrder,
      }
    )

    res.json(updatedRollCall)
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
