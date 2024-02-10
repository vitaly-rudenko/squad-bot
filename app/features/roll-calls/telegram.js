import { PatternBuilder, PatternMatcher, EntryMatchers } from '@vitalyrudenko/templater'
import { escapeMd } from '../../utils/escapeMd.js'
import { GROUP_CHAT_TYPES } from '../../shared/middlewares/groupChat.js'
import { registry } from '../../registry.js'

export function createRollCallsFlow() {
  const { rollCallsStorage, membershipStorage, usersStorage, generateWebAppUrl, localize } = registry.export()

  /** @param {import('telegraf').Context} context */
  const rollCalls = async (context) => {
    const { chatId, locale } = context.state

    const isGroup = GROUP_CHAT_TYPES.includes(/** @type {string} */ (context.chat?.type))

    const viewUrl = isGroup ? generateWebAppUrl(`roll-calls${chatId}`) : generateWebAppUrl('groups')
    const createUrl = isGroup ? generateWebAppUrl(`new-roll-call${chatId}`) : undefined

    await context.reply(
      localize(locale, isGroup ? 'rollCalls.command.group' : 'rollCalls.command.private', {
        viewUrl: escapeMd(viewUrl),
        ...createUrl && { createUrl: escapeMd(createUrl) },
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

    const rollCalls = await rollCallsStorage.findByGroupId(chatId)

    const patternMatcher = new PatternMatcher()
    const entryMatchers = new EntryMatchers()

    let matchedRollCall, text
    for (const rollCall of rollCalls) {
      const result = patternMatcher.match(
        context.message.text,
        new PatternBuilder().build(rollCall.messagePattern),
        entryMatchers,
        { returnCombination: true }
      )

      if (!result) continue

      matchedRollCall = rollCall
      text = result.fields[0]?.value
      break
    }

    if (!matchedRollCall) return next()

    let userIdsToNotify
    if (matchedRollCall.usersPattern === '*') {
      userIdsToNotify = await membershipStorage.findUserIdsByGroupId(chatId)
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

    /** @param {any} user */
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

    const usersToNotify = await usersStorage.findByIds(userIdsToNotify)
    const mentions = usersToNotify.map(formatMention).join(' ')
    const sendPoll = matchedRollCall.pollOptions.length > 0
    const message = (text && !sendPoll)
      ? localize(locale, 'rollCalls.message.withText', { text: escapeMd(text), mentions })
      : localize(locale, 'rollCalls.message.withoutText', { mentions })

    await context.reply(message, { parse_mode: 'MarkdownV2' })

    if (sendPoll) {
      await context.replyWithPoll(
        text || localize(locale, 'rollCalls.defaultPollTitle'),
        matchedRollCall.pollOptions,
        { is_anonymous: false }
      )
    }
  }

  return {
    rollCalls,
    rollCallMessage,
  }
}
