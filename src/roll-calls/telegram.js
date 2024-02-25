// @ts-expect-error TODO: create typings for templater
import { PatternBuilder, PatternMatcher, EntryMatchers } from '@vitalyrudenko/templater'
import { registry } from '../registry.js'
import { escapeMd, isGroupChat } from '../common/telegram.js'

export function createRollCallsFlow() {
  const { rollCallsStorage, membershipStorage, usersStorage, localize, generateWebAppUrl } = registry.export()

  /** @param {import('telegraf').Context} context */
  const rollCalls = async (context) => {
    const { chatId, locale } = context.state

    const isGroup = isGroupChat(context)

    const viewUrl = isGroup ? generateWebAppUrl(`roll-calls${chatId}`) : generateWebAppUrl('groups')

    await context.reply(
      localize(locale, 'rollCalls.command.message', {
        viewUrl: escapeMd(viewUrl),
      }),
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    )
  }

  /**
   * @param {import('telegraf').Context} context
   * @param {Function} next
   */
  const rollCallMessage = async (context, next) => {
    if (!context.message || !('text' in context.message)) return next()
    const { userId, chatId, locale } = context.state

    const { items: rollCalls } = await rollCallsStorage.find({ groupIds: [chatId] })

    const patternMatcher = new PatternMatcher()
    const entryMatchers = new EntryMatchers()

    let matchedRollCall, title
    for (const rollCall of rollCalls) {
      const result = patternMatcher.match(
        context.message.text,
        new PatternBuilder().build(rollCall.messagePattern),
        entryMatchers,
        { returnCombination: true }
      )

      if (!result) continue

      matchedRollCall = rollCall
      title = result.fields[0]?.value
      break
    }

    if (!matchedRollCall) return next()

    let userIdsToNotify
    if (matchedRollCall.usersPattern === '*') {
      userIdsToNotify = (await membershipStorage.find({ groupIds: [chatId] }))
        .map(m => m.userId)
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
          username: escapeMd(user.username)
        })
      } else {
        return localize(locale, 'rollCalls.mention.withoutUsername', {
          name: escapeMd(user.name),
          profileUrl: escapeMd(`tg://user?id=${user.id}`),
        })
      }
    }

    const name = context.from?.first_name ?? 'Unknown user'
    const usersToNotify = await usersStorage.find({ ids: userIdsToNotify })
    const mentions = usersToNotify.map(formatMention).join(' ')
    const sendPoll = matchedRollCall.pollOptions.length > 0
    const message = (title && !sendPoll)
      ? localize(locale, 'rollCalls.message.withTitle', { title: escapeMd(title), mentions, name })
      : localize(locale, 'rollCalls.message.withoutTitle', { mentions, name })

    await context.reply(message, { parse_mode: 'MarkdownV2', disable_web_page_preview: true })

    if (sendPoll) {
      await context.replyWithPoll(
        title || localize(locale, 'rollCalls.defaultPollTitle'),
        matchedRollCall.pollOptions,
        { is_anonymous: false, disable_notification: true }
      )
    }
  }

  return {
    rollCalls,
    rollCallMessage,
  }
}
