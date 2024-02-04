import { PatternBuilder, PatternMatcher, EntryMatchers } from '@vitalyrudenko/templater'
import { escapeMd } from '../../utils/escapeMd.js'
import { GROUP_CHAT_TYPES } from '../../shared/middlewares/groupChat.js'

export function rollCallsCommand({ generateWebAppUrl }) {
  return async (context) => {
    const { chatId, localize } = context.state

    const isGroup = GROUP_CHAT_TYPES.includes(context.chat.type)

    const viewUrl = isGroup ? generateWebAppUrl(`roll-calls${chatId}`) : generateWebAppUrl('groups')
    const createUrl = isGroup ? generateWebAppUrl(`new-roll-call${chatId}`) : undefined

    await context.reply(
      localize(isGroup ? 'command.rollCalls.group' : 'command.rollCalls.private', {
        viewUrl: escapeMd(viewUrl),
        ...createUrl && { createUrl: escapeMd(createUrl) },
      }),
      { parse_mode: 'MarkdownV2', disable_web_page_preview: true }
    )
  }
}

export function rollCallsMessage({ rollCallsStorage, membershipStorage, usersStorage }) {
  return async (context, next) => {
    if (!('text' in context.message)) return next()

    const { userId, chatId, localize } = context.state

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
      await context.reply(localize('rollCalls.noOneToMention'))
      return
    }

    function formatMention(user) {
      if (user.username) {
        return localize('rollCalls.mention.withUsername', { username: escapeMd(user.username) })
      } else {
        return localize('rollCalls.mention.withoutUsername', {
          name: escapeMd(user.name),
          profileUrl: escapeMd(`tg://user?id=${user.id}`),
        })
      }
    }

    const usersToNotify = await usersStorage.findByIds(userIdsToNotify)
    const mentions = usersToNotify.map(formatMention).join(' ')
    const sendPoll = matchedRollCall.pollOptions.length > 0
    const message = (text && !sendPoll)
      ? localize('rollCalls.message.withText', { text: escapeMd(text), mentions })
      : localize('rollCalls.message.withoutText', { mentions })

    await context.reply(message, { parse_mode: 'MarkdownV2' })

    if (sendPoll) {
      await context.replyWithPoll(
        text || localize('rollCalls.defaultPollTitle'),
        matchedRollCall.pollOptions,
        { is_anonymous: false }
      )
    }
  }
}
