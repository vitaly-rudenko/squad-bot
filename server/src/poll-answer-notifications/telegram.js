import { escapeMd, isGroupChat } from '../common/telegram.js'
import { registry } from '../registry.js'

// TODO: Use database for storing polls instead of relying on cache

export function createPollAnswerNotificationsFlow() {
  const { groupCache, groupStorage, telegram, localize, pollsCache } = registry.export()

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

  // TODO: Store this in Redis instead of memory
  /** @type {Map<string, number>} */
  const latestPollMessageIds = new Map()

  /** @param {import('telegraf').Context} context */
  const pollAnswer = async context => {
    if (!context.pollAnswer) return
    if (!context.pollAnswer.user) return

    const pollId = context.pollAnswer.poll_id
    const userId = context.pollAnswer.user.id

    const poll = await pollsCache.get(pollId)
    if (!poll) return

    const group = await groupStorage.findById(poll.chatId)
    if (!group) return
    if (!group.pollAnswerNotificationsEnabledAt) return

    const latestPollMessageId = latestPollMessageIds.get(`${pollId}:${userId}`)
    if (latestPollMessageId) {
      await telegram.deleteMessage(poll.chatId, latestPollMessageId).catch(() => {})
    }

    const message = await telegram.sendMessage(
      poll.chatId,
      localize(
        poll.locale,
        context.pollAnswer.option_ids.length > 0
          ? 'pollAnswerNotifications.voted'
          : 'pollAnswerNotifications.retracted',
        {
          voter: escapeMd(context.pollAnswer.user.first_name ?? localize(poll.locale, 'unknownUser')),
          pollOptions: context.pollAnswer.option_ids
            .map(
              optionId =>
                poll.pollOptions[optionId] || localize(poll.locale, 'pollAnswerNotifications.unknownPollOption'),
            )
            .map(pollOption =>
              localize(poll.locale, 'pollAnswerNotifications.pollOptionsListItem', {
                pollOption: escapeMd(pollOption),
              }),
            )
            .join(localize(poll.locale, 'pollAnswerNotifications.pollOptionsListDelimiter')),
        },
      ),
      {
        reply_to_message_id: Number(poll.messageId),
        disable_notification: true,
        allow_sending_without_reply: true,
        parse_mode: 'MarkdownV2',
      },
    )

    latestPollMessageIds.set(`${pollId}:${userId}`, message.message_id)
  }

  return {
    togglePollAnswerNotifications,
    pollAnswer,
  }
}
