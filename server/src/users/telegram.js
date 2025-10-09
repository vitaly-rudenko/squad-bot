import { escapeMd } from '../common/telegram.js'
import { localeFromLanguageCode } from '../localization/telegram.js'
import { registry } from '../registry.js'

export function useUsersFlow() {
  const { usersStorage, usersCache, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const start = async context => {
    const telegramUser = context.from || context.pollAnswer?.user
    if (!telegramUser) return

    const { locale } = context.state

    await registerTelegramUser(telegramUser, { usersStorage })

    await context.reply(localize(locale, 'users.command.start.message'), { parse_mode: 'MarkdownV2' })
  }

  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  const useRegisterUser = async (context, next) => {
    const telegramUser = context.from || context.pollAnswer?.user
    if (!telegramUser) return

    const { userId } = context.state

    if (!(await usersCache.has(userId))) {
      await registerTelegramUser(telegramUser, { usersStorage })

      const user = await usersStorage.findById(userId)
      if (!user) throw new Error(`Could not find User by userId: ${userId}`)
      await usersCache.set(userId, user)
    }

    return next()
  }

  return { start, useRegisterUser }
}

/**
 * @param {import('telegraf/types').User} user
 * @param {import('../types').Deps<'usersStorage'>} dependencies
 */
export async function registerTelegramUser(user, { usersStorage }) {
  await usersStorage.store({
    id: String(user.id),
    name: user.first_name,
    ...(user.username ? { username: user.username } : undefined),
    locale: localeFromLanguageCode(user.language_code),
  })
}

export const withUserId = () => {
  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  return async (context, next) => {
    const userId = context.from?.id || context.pollAnswer?.user?.id
    if (!userId) return // ignore

    context.state.userId = String(userId)
    return next()
  }
}

/** @param {import('../users/types').User} user */
export function renderUserMd(user) {
  return user.username
    ? escapeMd(`${user.name} (@${user.username})`)
    : `[${escapeMd(user.name)}](${escapeMd(`tg://user?id=${user.id}`)})`
}
