import { Markup } from 'telegraf'
import { logger } from '../../../logger.js'
import { Phases } from '../../Phases.js'
import { escapeMd } from '../../utils/escapeMd.js'

async function getApplicableUsers(chatId, { bot, membershipStorage }) {
  const administrators = await bot.telegram.getChatAdministrators(chatId)
  const creator = administrators.find(a => a.status === 'creator')
  const creatorUserId = String(creator?.user.id)

  const memberUserIds = await membershipStorage.findUserIdsByGroupId(chatId)
  return memberUserIds.filter(userId => userId !== creatorUserId)
}

function selectRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)]
}

/** @param {{ bot: import('telegraf').Telegraf, membershipStorage, usersStorage }} opts */
export function titleSetCommand({ bot, membershipStorage, usersStorage }) {
  return async (context) => {
    const { userSession, chatId, localize } = context.state

    const applicableUserIds = await getApplicableUsers(chatId, { bot, membershipStorage })
    if (applicableUserIds.length === 0) {
      await context.reply(localize('command.title.set.noOneToChooseFrom'), { parse_mode: 'MarkdownV2' })
      return
    }

    const users = await usersStorage.findByIds(applicableUserIds)

    await context.reply(localize('command.title.set.chooseUser'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard([
          ...users.map(user => Markup.button.callback(
            localize('command.title.set.user', {
              name: user.name,
              username: user.username,
            }),
            `title:set:user-id:${user.id}`
          )),
          Markup.button.callback(localize('command.title.set.selectRandom'), 'title:set:user-id:random'),
          Markup.button.callback(localize('command.title.set.cancel'), 'title:set:cancel'),
        ],
        { columns: 2 }
      ).reply_markup
    })

    await userSession.setPhase(Phases.title.set.chooseUser)
  }
}

export function titleSetUserIdAction({ usersStorage }) {
  return async (context) => {
    const { userSession, localize } = context.state

    await context.answerCbQuery()
    await context.deleteMessage()

    const subjectUserId = context.match[1]
    const subjectUser = subjectUserId !== 'random' && await usersStorage.findById(subjectUserId)

    await context.reply(
      localize('command.title.set.sendTitle', {
        name: subjectUser
          ? escapeMd(subjectUser.name)
          : localize('command.title.set.randomUserName'),
      }),
      {
        parse_mode: 'MarkdownV2',
        reply_markup: Markup.inlineKeyboard([
            Markup.button.callback(localize('command.title.set.cancel'), 'title:set:cancel'),
          ],
          { columns: 2 }
        ).reply_markup
      }
    )

    await userSession.setContext({ subjectUserId })
    await userSession.setPhase(Phases.title.set.sendTitle)
  }
}

export function titleSetCancelAction() {
  return async (context) => {
    const { userSession, localize } = context.state

    await context.answerCbQuery()
    await context.deleteMessage()
    await userSession.clear()

    await context.reply(localize('command.title.set.canceled'), { parse_mode: 'MarkdownV2' })
  }
}

/** @param {{ bot: import('telegraf').Telegraf, membershipStorage, usersStorage }} opts */
export function titleSetMessage({ bot, membershipStorage, usersStorage }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { userSession, chatId, localize } = context.state
    const title = context.message.text

    let { subjectUserId } = await userSession.getContext()
    await userSession.clear()

    if (subjectUserId === 'random') {
      const applicableUserIds = await getApplicableUsers(chatId, { bot, membershipStorage })
      if (applicableUserIds.length === 0) {
        await context.reply(localize('command.title.set.noOneToChooseFrom'), { parse_mode: 'MarkdownV2' })
        return
      }

      subjectUserId = selectRandomItem(applicableUserIds)
    }

    const subjectUser = await usersStorage.findById(subjectUserId)

    try {
      await bot.telegram.promoteChatMember(chatId, subjectUserId, {
        can_change_info: true,
        can_invite_users: true,
        can_manage_chat: true,
        can_manage_voice_chats: true,
        can_pin_messages: true,
      })
    } catch (error) {
      logger.warn({ error, chatId, subjectUser }, 'Cloud not promote a user')
    }

    try {
      await bot.telegram.setChatAdministratorCustomTitle(chatId, subjectUserId, title)
    } catch (error) {
      logger.warn({ error, chatId, subjectUser, title }, 'Cloud not promote user\'s title')
      await context.reply(
        localize('command.title.set.failed', { name: escapeMd(subjectUser.name) }),
        { parse_mode: 'MarkdownV2' }
      )
      return
    }

    await context.reply(
      localize('command.title.set.done', {
        name: escapeMd(subjectUser.name),
        title: escapeMd(title)
      }),
      { parse_mode: 'MarkdownV2' }
    )
  }
}
