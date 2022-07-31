import { Markup } from 'telegraf'
import { Phases } from '../../Phases.js'
import { escapeMd } from '../../utils/escapeMd.js'

export function titleSetCommand({ membershipStorage, usersStorage }) {
  return async (context) => {
    const { userSession, chatId, localize } = context.state

    const memberUserIds = await membershipStorage.findUserIdsByGroupId(chatId)
    const users = await usersStorage.findByIds(memberUserIds)

    await context.reply(localize('command.title.set.chooseUser'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        users.map(user => Markup.button.callback(
          localize('command.title.set.user', {
            name: user.name,
            username: user.username,
          }),
          `title:set:user-id:${user.id}`
        )),
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
    const subjectUser = await usersStorage.findById(subjectUserId)

    await context.reply(
      localize('command.title.set.sendTitle', {
        name: escapeMd(subjectUser.name),
      }),
      { parse_mode: 'MarkdownV2' }
    )

    await userSession.setContext({ subjectUserId })
    await userSession.setPhase(Phases.title.set.sendTitle)
  }
}

/** @param {{ bot: import('telegraf').Telegraf, usersStorage }} opts */
export function titleSetMessage({ bot, usersStorage }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { userSession, chatId, localize } = context.state
    const title = context.message.text

    await userSession.clear()

    const { subjectUserId } = await userSession.getContext()
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
      console.log('Could not promote:', error)
    }

    try {
      await bot.telegram.setChatAdministratorCustomTitle(chatId, subjectUserId, title)
    } catch (error) {
      console.log('Could not update title:', error)
      await context.reply(localize('command.title.set.failed'), { parse_mode: 'MarkdownV2' })
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
