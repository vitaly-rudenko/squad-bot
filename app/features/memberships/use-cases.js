import { logger } from '../../../logger.js'
import { isChatMember } from './telegram.js'

/**
 * @param {{
 *   membershipCache: import('../../utils/RedisCache').RedisCache
 *   membershipStorage: import('./storage').MembershipPostgresStorage
 *   telegram: import('telegraf').Telegram
 * }} input
 */
export async function runRefreshMembershipsTask({ membershipCache, membershipStorage, telegram }) {
  logger.debug('Running "refreshMemberships" use case')

  const memberships = await membershipStorage.findOldest({ limit: 10 })
  logger.debug(`Found ${memberships.length} memberships to refresh, starting`)

  for (const { userId, groupId } of memberships) {
    logger.debug(`Refreshing membership of user ${userId} in chat: ${groupId}`)

    try {
      if (await isChatMember({ userId, groupId, telegram })) {
        await membershipStorage.store(userId, groupId)
      } else {
        await unlink({ userId, groupId, membershipStorage, membershipCache })
      }
    } catch (err) {
      logger.error({ err, userId, groupId }, 'Could not refresh membership link, unlinking')

      try {
        await unlink({ userId, groupId, membershipStorage, membershipCache })
      } catch (error) {
        logger.error({ err, userId, groupId }, 'Could not unlink failed membership link')
      }
    }
  }
}

/**
 * @param {{
 *   userId: string
 *   groupId: string
 *   membershipCache: import('../../utils/RedisCache').RedisCache
 *   membershipStorage: import('./storage').MembershipPostgresStorage
 * }} input
 */
export async function unlink({ userId, groupId, membershipStorage, membershipCache }) {
  await membershipStorage.delete(userId, groupId)
  await membershipCache.delete(`${userId}_${groupId}`)
}
