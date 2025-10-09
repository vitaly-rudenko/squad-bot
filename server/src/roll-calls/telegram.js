// @ts-expect-error TODO: create typings for templater
import { PatternBuilder, PatternMatcher, EntryMatchers } from '@vitalyrudenko/templater'
import { registry } from '../registry.js'
import { escapeMd, isGroupChat } from '../common/telegram.js'
import { splitArrayIntoGroups } from '../common/utils.js'

const MIN_POLL_OPTIONS_PER_POLL = 2
const MAX_POLL_OPTIONS_PER_POLL = 10

export function createRollCallsFlow() {
  const { rollCallsStorage, membershipStorage, usersStorage, localize, generateWebAppUrl, pollsCache } =
    registry.export()

  /** @param {import('telegraf').Context} context */
  const rollCalls = async context => {
    const { chatId, locale } = context.state

    const isGroup = isGroupChat(context)

    const viewUrl = isGroup ? generateWebAppUrl(`roll-calls${chatId}`) : generateWebAppUrl('groups')

    await context.reply(
      localize(locale, 'rollCalls.command.message', {
        viewUrl: escapeMd(viewUrl),
      }),
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true },
    )
  }

  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  const rollCallMessage = async (context, next) => {
    if (!context.message || !('text' in context.message)) return next()
    const { userId, chatId, locale } = context.state
    const message = context.message.text
    const { items: rollCalls } = await rollCallsStorage.find({ groupIds: [chatId] })

    const patternMatcher = new PatternMatcher()
    const entryMatchers = new EntryMatchers()

    let matchedRollCall
    for (const rollCall of rollCalls) {
      const result = patternMatcher.match(message, new PatternBuilder().build(rollCall.messagePattern), entryMatchers, {
        returnCombination: true,
      })

      if (!result) continue

      matchedRollCall = rollCall
      break
    }

    if (!matchedRollCall) return next()

    let userIdsToNotify
    if (matchedRollCall.usersPattern === '*') {
      userIdsToNotify = (await membershipStorage.find({ groupIds: [chatId] })).map(m => m.userId)
    } else {
      userIdsToNotify = matchedRollCall.usersPattern.split(',')
    }

    if (matchedRollCall.excludeSender) {
      userIdsToNotify = userIdsToNotify.filter(id => id !== userId)
    }

    if (userIdsToNotify.length === 0) {
      await context.reply(localize(locale, 'rollCalls.noOneToMention'))
      return
    }

    /** @param {import('../users/types').User} user */
    function formatMention(user) {
      if (user.username) {
        return localize(locale, 'rollCalls.mention.withUsername', {
          username: escapeMd(user.username),
        })
      } else {
        return localize(locale, 'rollCalls.mention.withoutUsername', {
          name: escapeMd(user.name),
          profileUrl: escapeMd(`tg://user?id=${user.id}`),
        })
      }
    }

    const sender = context.from?.first_name ?? localize(locale, 'unknownUser')
    const usersToNotify = await usersStorage.find({ ids: userIdsToNotify })
    const mentions = usersToNotify.map(formatMention).join(' ')
    const sendPoll = matchedRollCall.pollOptions.length > 0
    const notification = localize(locale, 'rollCalls.notification', {
      message: escapeMd(message),
      sender: escapeMd(sender),
      mentions,
    })

    await context.reply(notification, { parse_mode: 'MarkdownV2', disable_web_page_preview: true })

    if (sendPoll) {
      // Telegram has limits for polls: min options count is 2, max options count is 10
      // When option count is more than 10, we split them into multiple polls
      // To avoid forcing people to pick an option, we add "N/A" option to each poll
      const pollOptionsGroups =
        matchedRollCall.pollOptions.length > MAX_POLL_OPTIONS_PER_POLL
          ? splitArrayIntoGroups(matchedRollCall.pollOptions, {
              min: MIN_POLL_OPTIONS_PER_POLL,
              max: MAX_POLL_OPTIONS_PER_POLL - 1,
            }).map(pollOptions => [...pollOptions, localize(locale, 'rollCalls.notApplicablePollOption')])
          : [matchedRollCall.pollOptions]

      for (const [i, pollOptions] of pollOptionsGroups.entries()) {
        const message = await context.replyWithPoll(
          pollOptionsGroups.length > 1
            ? localize(
                locale,
                matchedRollCall.isMultiselectPoll ? 'rollCalls.groupPollTitleMultiselect' : 'rollCalls.groupPollTitle',
                { group: i + 1, groups: pollOptionsGroups.length },
              )
            : localize(
                locale,
                matchedRollCall.isMultiselectPoll ? 'rollCalls.pollTitleMultiselect' : 'rollCalls.pollTitle',
              ),
          pollOptions,
          {
            is_anonymous: matchedRollCall.isAnonymousPoll,
            allows_multiple_answers: matchedRollCall.isMultiselectPoll,
            disable_notification: true,
          },
        )

        await pollsCache.set(message.poll.id, {
          locale,
          chatId: String(message.chat.id),
          messageId: String(message.message_id),
          pollOptions,
        })
      }
    }
  }

  return {
    rollCalls,
    rollCallMessage,
  }
}
