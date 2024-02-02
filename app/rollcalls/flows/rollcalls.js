import { PatternBuilder, PatternMatcher, EntryMatchers } from '@vitalyrudenko/templater'
import { escapeMd } from '../../utils/escapeMd.js'

export function rollCallsCommand({ usersStorage, generateWebAppUrl }) {
  return async (context) => {
    const { userId, chatId, localize } = context.state

    const user = await usersStorage.findById(userId)
    const viewUrl = generateWebAppUrl('group', chatId, 'roll-calls')
    const createUrl = generateWebAppUrl('group', chatId, 'roll-call', 'new')

    await context.reply(
      localize('command.rollCalls.help', {
        name: escapeMd(user.name),
        viewUrl: escapeMd(viewUrl),
        createUrl: escapeMd(createUrl),
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
