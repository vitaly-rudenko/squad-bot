export class MembershipManager {
  constructor({ telegram, membershipCache, membershipStorage }) {
    this._telegram = telegram
    this._membershipCache = membershipCache
    this._membershipStorage = membershipStorage
  }

  async link(userId, chatId, { optimize = false } = {}) {
    const isNew = await this._membershipCache.cache(userId, chatId)

    if (!optimize || isNew) {
      await this._membershipStorage.store(userId, chatId)
      console.log(`User ${userId} is now linked to the chat: ${chatId}`)
    }
  }

  async unlink(userId, chatId) {
    await this._membershipCache.delete(userId, chatId)
    await this._membershipStorage.delete(userId, chatId)

    console.log(`User ${userId} is now unlinked from the chat: ${chatId}`)
  }

  async refreshLink(userId, chatId) {
    if (await this.isChatMember(userId, chatId)) {
      await this.link(userId, chatId)
    } else {
      await this.unlink(userId, chatId)
    }
  }

  async isChatMember(userId, chatId) {
    try {
      await this._telegram.getChatMember(chatId, userId)
    } catch (error) {
      if (error.code === 400) {
        return false
      }

      throw error
    }

    return true
  }
}
