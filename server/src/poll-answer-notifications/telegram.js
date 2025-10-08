import { isGroupChat } from '../common/telegram.js'
import { registry } from '../registry.js'

export function createPollAnswerNotificationsFlow() {
  const { groupCache, groupStorage, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const togglePollAnswerNotifications = async context => {
    const { chatId, locale } = context.state

    const group = await groupStorage.findById(chatId)
    if (!group) return

    await groupStorage.store({
      id: group.id,
      title: group.title,
      pollAnswerNotificationsEnabledAt: group.pollAnswerNotificationsEnabledAt ? null : new Date(),
    })
    await groupCache.delete(chatId)

    await context.reply(
      localize(
        locale,
        group.pollAnswerNotificationsEnabledAt ? 'pollAnswerNotifications.disabled' : 'pollAnswerNotifications.enabled',
      ),
    )
  }

  /** @param {import('telegraf').Context} context */
  const pollAnswer = async context => {
    const { chatId, locale } = context.state

    console.log('pollAnswer', context.message, context.pollAnswer)

    if (!context.message) return
    if (!context.pollAnswer?.user) return

    const isGroup = isGroupChat(context)
    if (!isGroup) return

    const group = await groupStorage.findById(chatId)
    if (!group) return
    if (!group.pollAnswerNotificationsEnabledAt) return

    await context
      .reply(
        localize(locale, 'pollAnswerNotifications.message', {
          answerer: context.pollAnswer.user.first_name ?? localize(locale, 'unknownUser'),
        }),
        {
          reply_to_message_id: context.message.message_id,
          disable_notification: true,
          allow_sending_without_reply: false,
        },
      )
      .catch(() => {})
  }

  return {
    togglePollAnswerNotifications,
    pollAnswer,
  }
}
