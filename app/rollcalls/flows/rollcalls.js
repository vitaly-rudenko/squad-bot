import { Markup } from 'telegraf'
import { Phases } from '../../Phases.js'
import { escapeMd } from '../../utils/escapeMd.js'

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
