import { logger } from '../../logger.js'

export class RefreshMembershipsUseCase {
  constructor({ membershipStorage, membershipManager, errorLogger }) {
    this._membershipStorage = membershipStorage
    this._membershipManager = membershipManager
    this._errorLogger = errorLogger
  }

  async run() {
    logger.debug('Running "refreshMemberships" use case')

    const memberships = await this._membershipStorage.findOldest({ limit: 10 })
    logger.info(`Found ${memberships.length} memberships to refresh, starting`)

    for (const { userId, groupId } of memberships) {
      logger.debug(`Refreshing membership of user ${userId} in chat: ${groupId}`)

      try {
        await this._membershipManager.refreshLink(userId, groupId)
      } catch (error) {
        this._errorLogger.log(error, 'Could not refresh membership link', { userId, groupId })
      }
    }
  }
}
