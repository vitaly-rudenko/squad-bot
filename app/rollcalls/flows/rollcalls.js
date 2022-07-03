import { Markup } from 'telegraf'
import { PatternBuilder, PatternMatcher, EntryMatchers } from '@vitalyrudenko/templater'
import { Phases } from '../../Phases.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { RollCall } from '../RollCall.js'

export function rollCallsCommand({ rollCallsStorage, usersStorage, userSessionManager }) {
  return async (context) => {
    const { userId, chatId, localize } = context.state

    const rollCalls = await rollCallsStorage.findByChatId(chatId)

    const userIds = [...new Set(
      rollCalls
        .filter(rc => rc.usersPattern !== '*')
        .map(rc => rc.usersPattern.split(','))
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

    await userSessionManager.setPhase(userId, Phases.rollCalls)
  }
}

export function rollCallsDeleteAction({ userSessionManager, rollCallsStorage }) {
  return async (context) => {
    const { userId, chatId, localize } = context.state

    await context.answerCbQuery()
    await context.deleteMessage()

    const rollCalls = await rollCallsStorage.findByChatId(chatId)

    await context.reply(localize('command.rollCalls.delete.choose'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        rollCalls
          .map(rc => Markup.button.callback(rc.messagePattern, `rollcalls:delete:id:${rc.id}`))
          .concat(Markup.button.callback(localize('command.rollCalls.delete.cancel'), 'rollcalls:delete:cancel')),
        { columns: 1 }
      ).reply_markup
    })

    await userSessionManager.setPhase(userId, Phases.deleteRollCall.id)
  }
}

export function rollCallsDeleteCancelAction({ userSessionManager }) {
  return async (context) => {
    const { userId } = context.state

    await context.answerCbQuery()

    await userSessionManager.clear(userId)

    await context.deleteMessage()
  }
}

export function rollCallsDeleteIdAction({ userSessionManager, rollCallsStorage }) {
  return async (context) => {
    const { userId, localize } = context.state

    await context.answerCbQuery()

    const rollCallId = context.match[1]
    await rollCallsStorage.deleteById(rollCallId)

    await userSessionManager.clear(userId)

    await context.deleteMessage()
    await context.reply(
      localize('command.rollCalls.delete.deleted'),
      { parse_mode: 'MarkdownV2' }
    )
  }
}

export function rollCallsAddAction({ userSessionManager }) {
  return async (context) => {
    const { userId, localize } = context.state

    await context.answerCbQuery()

    await context.deleteMessage()
    await context.reply(
      localize('command.rollCalls.add.sendMessagePattern'),
      { parse_mode: 'MarkdownV2' }
    )

    await userSessionManager.setPhase(userId, Phases.addRollCall.messagePattern)
  }
}

export function rollCallsAddMessagePatternMessage({ userSessionManager }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { userId, localize } = context.state

    await userSessionManager.setContext(userId, {
      messagePattern: context.message.text,
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

    await userSessionManager.setPhase(userId, Phases.addRollCall.usersPattern)
  }
}

export function rollCallsAddUsersPatternAllAction({ userSessionManager }) {
  return async (context) => {
    await context.answerCbQuery()

    await handleUsersPattern(context, '*', userSessionManager)
  }
}

export function rollCallsAddUsersPatternMessage({ userSessionManager, membershipStorage, usersStorage }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { chatId } = context.state

    const chatUserIds = await membershipStorage.findUserIdsByChatId(chatId)
    const chatUsers = await usersStorage.findByIds(chatUserIds)

    const users = context.message.text.split('\n')
      .map(input => chatUsers.find(u => u.username === input.slice(1) || u.username === input || u.id === input || u.name === input))
      .filter(Boolean)

    await handleUsersPattern(context, users.map(u => u.id).join(','), userSessionManager)
  }
}

async function handleUsersPattern(context, usersPattern, userSessionManager) {
  const { userId, localize } = context.state

  await userSessionManager.amendContext(userId, {
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

  await userSessionManager.setPhase(userId, Phases.addRollCall.excludeSender)
}

export function rollCallsAddExcludeSenderAction({ userSessionManager }) {
  return async (context) => {
    const { userId, localize } = context.state

    await context.answerCbQuery()

    await userSessionManager.amendContext(userId, {
      excludeSender: context.match[1] === 'yes',
    })

    await context.reply(
      localize('command.rollCalls.add.sendPollOptions'),
      {
        reply_markup: Markup.inlineKeyboard([
          Markup.button.callback(localize('command.rollCalls.add.skipPollOptions'), 'rollcalls:add:poll-options:skip'),
        ]).reply_markup,
        parse_mode: 'MarkdownV2'
      }
    )

    await userSessionManager.setPhase(userId, Phases.addRollCall.pollOptions)
  }
}

export function rollCallsAddPollOptionsSkipAction({ userSessionManager, rollCallsStorage }) {
  return async (context) => {
    await context.answerCbQuery()

    await handlePollOptions(context, [], userSessionManager, rollCallsStorage)
  }
}

export function rollCallsAddPollOptionsMessage({ userSessionManager, rollCallsStorage }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { localize } = context.state

    const pollOptions = context.message.text.split('\n').filter(Boolean)

    if (pollOptions.length < 2) {
      await context.reply(localize('command.rollCalls.add.tooFewPollOptions'))
      return
    }

    await handlePollOptions(context, pollOptions, userSessionManager, rollCallsStorage)
  }
}

async function handlePollOptions(context, pollOptions, userSessionManager, rollCallsStorage) {
  const { chatId, userId, localize } = context.state

  const { messagePattern, usersPattern, excludeSender } = await userSessionManager.getContext(userId)

  await rollCallsStorage.create(
    new RollCall({
      chatId,
      messagePattern,
      usersPattern,
      excludeSender,
      pollOptions,
    })
  )

  await userSessionManager.clear(userId)

  await context.reply(localize('command.rollCalls.add.added'))
}

// --- ROLL CALL MESSAGE

export function rollCallsMessage({ rollCallsStorage, membershipStorage, usersStorage }) {
  return async (context, next) => {
    if (!('text' in context.message)) return next()

    const { userId, chatId, localize } = context.state

    const rollCalls = await rollCallsStorage.findByChatId(chatId)
    rollCalls.sort((a, b) => b.messagePattern.length - a.messagePattern.length)

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

      if (!result) continue;

      matchedRollCall = rollCall
      text = result.fields[0]?.value
    }

    if (!matchedRollCall) return next()

    let userIdsToNotify
    if (matchedRollCall.usersPattern === '*') {
      userIdsToNotify = await membershipStorage.findUserIdsByChatId(chatId)
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
