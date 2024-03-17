import { logger } from '../common/logger.js'
import { registry } from '../registry.js'
import { isChatMember } from './telegram.js'

export async function runRefreshMembershipsTask() {
  const { membershipStorage, telegram } = registry.export()

  const memberships = await membershipStorage.find({ allowNoConditions: true, limit: 10 })

  for (const { userId, groupId } of memberships) {
    try {
      if (await isChatMember({ userId, groupId, telegram })) {
        await membershipStorage.store(userId, groupId)
      } else {
        await unlink(userId, groupId)
      }
    } catch (err) {
      // bot was kicked from the group
      // if (err.code === 403) {
        // TODO: remove all links and the group
      // }

      logger.error({ err, userId, groupId }, 'Could not refresh membership link, unlinking')

      try {
        await unlink(userId, groupId)
      } catch (err) {
        logger.error({ err, userId, groupId }, 'Could not unlink failed membership link')
      }
    }
  }
}

/**
 * @param {string} userId
 * @param {string} groupId
 */
export async function unlink(userId, groupId) {
  const { membershipCache, membershipStorage } = registry.export()

  await membershipStorage.delete(userId, groupId)
  await membershipCache.delete(`${userId}_${groupId}`)
}
