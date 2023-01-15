import { logger } from '../../logger'

export class RefreshMembershipsUseCase {
  constructor({ membershipStorage, membershipManager, errorLogger }) {
    this._membershipStorage = membershipStorage
    this._membershipManager = membershipManager
    this._errorLogger = errorLogger
  }

  async run() {
    const memberships = await this._membershipStorage.findOldest({ limit: 10 })
    logger.info(`Found ${memberships.length} memberships to refresh`)

    for (const { userId, groupId } of memberships) {
      logger.info(`Refreshing membership of user ${userId} in chat: ${groupId}`)

      try {
        await this._membershipManager.refreshLink(userId, groupId)
      } catch (error) {
        this._errorLogger.log(error, 'Could not refresh membership link', { userId, groupId })
      }
    }
  }
}
