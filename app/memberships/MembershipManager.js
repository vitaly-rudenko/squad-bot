import { logger } from '../../logger.js'

export class MembershipManager {
  constructor({ telegram, membershipCache, membershipStorage }) {
    this._telegram = telegram
    this._membershipCache = membershipCache
    this._membershipStorage = membershipStorage
  }

  async isHardLinked(userId, groupId) {
    return this._membershipStorage.exists(userId, groupId)
  }

  async hardLink(userId, groupId) {
    await this._membershipCache.cache(userId, groupId)
    await this._storeLink(userId, groupId)
  }

  async softLink(userId, groupId) {
    if (await this._membershipCache.cache(userId, groupId)) {
      await this._storeLink(userId, groupId)
    }
  }

  async _storeLink(userId, groupId) {
    await this._membershipStorage.store(userId, groupId)
    logger.debug(`User ${userId} is now linked to the group: ${groupId}`)
  }

  async unlink(userId, groupId) {
    await this._membershipCache.delete(userId, groupId)
    await this._membershipStorage.delete(userId, groupId)
    logger.debug(`User ${userId} is now unlinked from the group: ${groupId}`)
  }

  async refreshLink(userId, groupId) {
    if (await this.isChatMember(userId, groupId)) {
      await this.hardLink(userId, groupId)
    } else {
      await this.unlink(userId, groupId)
    }
  }

  async isChatMember(userId, groupId) {
    try {
      await this._telegram.getChatMember(groupId, userId)
    } catch (error) {
      if (error.code === 400) {
        return false
      }

      throw error
    }

    return true
  }
}
