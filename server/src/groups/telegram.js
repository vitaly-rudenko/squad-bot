import { wrap, withGroupChat } from '../common/telegram.js'
import { registry } from '../registry.js'

export function createGroupsFlow() {
  const { groupStorage, groupCache, membershipCache, membershipStorage } = registry.export()

  const useRegisterGroupAndMembership = wrap(withGroupChat(), async (context, next) => {
    const { userId, chatId } = context.state

    if (!(await groupCache.has(chatId))) {
      await groupStorage.store({
        id: chatId,
        title: (context.chat && 'title' in context.chat)
          ? context.chat.title
          : '',
        socialLinkFixEnabledAt: undefined, // do not update
      })

      const group = await groupStorage.findById(chatId)
      if (!group) throw new Error(`Could not find Group by chatId: ${chatId}`)
      await groupCache.set(chatId, group)
    }

    if (!(await membershipCache.has(`${userId}_${chatId}`))) {
      await membershipStorage.store(userId, chatId)
      await membershipCache.set(`${userId}_${chatId}`, true)
    }

    return next()
  })

  return { useRegisterGroupAndMembership }
}