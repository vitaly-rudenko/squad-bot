import { Markup } from 'telegraf'
import { PatternBuilder, PatternMatcher, EntryMatchers } from '@vitalyrudenko/templater'
import { Phases } from '../../Phases.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { RollCall } from '../RollCall.js'

export function rollCallsCommand({ rollCallsStorage, usersStorage }) {
  return async (context) => {
    const { userSession, chatId, localize } = context.state

    const rollCalls = await rollCallsStorage.findByGroupId(chatId)

    const userIds = [...new Set(
      rollCalls
        .filter(rc => rc.usersPattern !== '*')
        .map(rc => rc.usersPattern.split(','))
        .reduce((acc, curr) => [...acc, ...curr], [])
    )]

    const users = await usersStorage.findByIds(userIds)

    function formatUsersPattern(usersPattern) {
      if (usersPattern === '*') {
        return localize('command.rollCalls.allUsers')
      }

      const userIds = usersPattern.split(',')
      const userNames = userIds
        .map(userId => users.find(u => u.id === userId)?.name ?? userId)
        .map(name => localize('command.rollCalls.user', { name: escapeMd(name) }))

      return userNames.join(', ')
    }

    function formatExcludeSender(excludeSender) {
      return excludeSender ? localize('command.rollCalls.excludingSender') : ''
    }

    function formatPollOptions(pollOptions) {
      return localize('command.rollCalls.pollOptions', {
        options: pollOptions
          .map(option => localize('command.rollCalls.pollOption', { option: escapeMd(option) }))
          .join(', ')
      })
    }

    function formatRollCall(rollCall) {
      const formatted = localize('command.rollCalls.rollCall', {
        messagePattern: escapeMd(rollCall.messagePattern),
        users: [formatUsersPattern(rollCall.usersPattern), formatExcludeSender(rollCall.excludeSender)].filter(Boolean).join(' '),
      })

      if (rollCall.pollOptions.length > 0) {
        return formatted + '\n' + formatPollOptions(rollCall.pollOptions)
      }

      return formatted
    }

    await context.deleteMessage()
    await context.reply(
      rollCalls.length > 0
        ? rollCalls.map(formatRollCall).join('\n')
        : localize('command.rollCalls.empty'),
      {
        parse_mode: 'MarkdownV2',
        reply_markup: Markup.inlineKeyboard(
          [
            Markup.button.callback(localize('command.rollCalls.actions.add'), 'rollcalls:add'),
            rollCalls.length > 0 && Markup.button.callback(localize('command.rollCalls.actions.delete'), 'rollcalls:delete'),
          ].filter(Boolean),
          { columns: 1 },
        ).reply_markup
      }
    )

    await userSession.setPhase(Phases.rollCalls)
  }
}

// --- DELETE ROLL CALL

export function rollCallsDeleteAction({ rollCallsStorage }) {
  return async (context) => {
    const { userSession, chatId, localize } = context.state

    await context.answerCbQuery()

    const rollCalls = await rollCallsStorage.findByGroupId(chatId)

    await context.deleteMessage()
    await context.reply(localize('command.rollCalls.delete.choose'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        rollCalls
          .map(rc => Markup.button.callback(rc.messagePattern, `rollcalls:delete:id:${rc.id}`))
          .concat(Markup.button.callback(localize('command.rollCalls.delete.cancel'), 'rollcalls:delete:cancel')),
        { columns: 1 }
      ).reply_markup
    })

    await userSession.setPhase(Phases.deleteRollCall.id)
  }
}

export function rollCallsDeleteCancelAction() {
  return async (context) => {
    const { userSession } = context.state

    await context.answerCbQuery()

    await userSession.clear()

    await context.deleteMessage()
  }
}

export function rollCallsDeleteIdAction({ rollCallsStorage }) {
  return async (context) => {
    const { userSession, localize } = context.state

    await context.answerCbQuery()

    const rollCallId = context.match[1]
    await rollCallsStorage.deleteById(rollCallId)

    await userSession.clear()

    await context.deleteMessage()
    await context.reply(
      localize('command.rollCalls.delete.deleted'),
      { parse_mode: 'MarkdownV2' }
    )
  }
}

// --- ADD ROLL CALL

export function rollCallsAddAction() {
  return async (context) => {
    const { userSession, localize } = context.state

    await context.answerCbQuery()

    await context.deleteMessage()
    await context.reply(
      localize('command.rollCalls.add.sendMessagePattern'),
      { parse_mode: 'MarkdownV2' }
    )

    await userSession.setPhase(Phases.addRollCall.messagePattern)
  }
}

export function rollCallsAddMessagePatternMessage() {
  return async (context) => {
    if (!('text' in context.message)) return

    const { userSession, localize } = context.state

    await userSession.setContext({
      messagePattern: context.message.text.trim(),
    })

    await context.reply(
      localize('command.rollCalls.add.sendUsersPattern'),
      {
        reply_markup: Markup.inlineKeyboard([
          Markup.button.callback(localize('command.rollCalls.add.useAllUsers'), 'rollcalls:add:users-pattern:all'),
        ]).reply_markup,
        parse_mode: 'MarkdownV2'
      }
    )

    await userSession.setPhase(Phases.addRollCall.usersPattern)
  }
}

export function rollCallsAddUsersPatternAllAction() {
  return async (context) => {
    const { userSession } = context.state

    await context.answerCbQuery()

    await context.deleteMessage()
    await handleUsersPattern(context, '*')
  }
}

export function rollCallsAddUsersPatternMessage({ membershipStorage, usersStorage }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { userSession, chatId, localize } = context.state

    const chatUserIds = await membershipStorage.findUserIdsByGroupId(chatId)
    const chatUsers = await usersStorage.findByIds(chatUserIds)

    function equalsIgnoreCase(str1, str2) {
      return str1.toLowerCase() === str2.toLowerCase()
    }

    const inputs = context.message.text.split('\n').map(s => s.trim()).filter(Boolean)
    const users = []
    for (const input of inputs) {
      const chatUser = chatUsers.find(u => (
        (u.username && (
          equalsIgnoreCase(u.username, input.slice(1)) ||
          equalsIgnoreCase(u.username, input)
        )) ||
        equalsIgnoreCase(u.id, input) ||
        equalsIgnoreCase(u.name, input)
      ))

      if (!chatUser) {
        await context.reply(
          localize('command.rollCalls.add.unknownUser', { input: escapeMd(input) }),
          { parse_mode: 'MarkdownV2' }
        )
        return
      }

      users.push(chatUser)
    }

    await handleUsersPattern(context, users.map(u => u.id).join(','))
  }
}

async function handleUsersPattern(context, usersPattern) {
  const { userSession, localize } = context.state

  await userSession.amendContext({
    usersPattern,
  })

  await context.reply(
    localize('command.rollCalls.add.excludeSender.message'),
    {
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback(localize('command.rollCalls.add.excludeSender.yes'), 'rollcalls:add:exclude-sender:yes'),
        Markup.button.callback(localize('command.rollCalls.add.excludeSender.no'), 'rollcalls:add:exclude-sender:no'),
      ]).reply_markup,
      parse_mode: 'MarkdownV2'
    }
  )

  await userSession.setPhase(Phases.addRollCall.excludeSender)
}

export function rollCallsAddExcludeSenderAction() {
  return async (context) => {
    const { userSession, localize } = context.state

    await context.answerCbQuery()

    await userSession.amendContext({
      excludeSender: context.match[1] === 'yes',
    })

    await context.deleteMessage()
    await context.reply(
      localize('command.rollCalls.add.sendPollOptions'),
      {
        reply_markup: Markup.inlineKeyboard([
          Markup.button.callback(localize('command.rollCalls.add.skipPollOptions'), 'rollcalls:add:poll-options:skip'),
        ]).reply_markup,
        parse_mode: 'MarkdownV2'
      }
    )

    await userSession.setPhase(Phases.addRollCall.pollOptions)
  }
}

export function rollCallsAddPollOptionsSkipAction({ rollCallsStorage }) {
  return async (context) => {
    await context.answerCbQuery()

    await context.deleteMessage()
    await handlePollOptions(context, [], rollCallsStorage)
  }
}

export function rollCallsAddPollOptionsMessage({ rollCallsStorage }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { localize } = context.state

    const pollOptions = context.message.text.split('\n').map(s => s.trim()).filter(Boolean)

    if (pollOptions.length < 2) {
      await context.reply(localize('command.rollCalls.add.tooFewPollOptions'))
      return
    }

    await handlePollOptions(context, pollOptions, rollCallsStorage)
  }
}

async function handlePollOptions(context, pollOptions, rollCallsStorage) {
  const { userSession, chatId, localize } = context.state

  const { messagePattern, usersPattern, excludeSender } = await userSession.getContext()

  const existingRollCalls = await rollCallsStorage.findByGroupId(chatId)
  await rollCallsStorage.create(
    new RollCall({
      groupId: chatId,
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
      sortOrder: Math.max(0, ...existingRollCalls.map(rc => rc.sortOrder)) + 1,
    })
  )

  await userSession.clear()

  await context.reply(localize('command.rollCalls.add.added'))
}

// --- ROLL CALL MESSAGE

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
