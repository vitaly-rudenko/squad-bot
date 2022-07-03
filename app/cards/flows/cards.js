import { Markup } from 'telegraf'
import { Phases } from '../../Phases.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { formatCardNumber } from '../../utils/formatCardNumber.js'
import { Card } from '../Card.js'

const banks = ['privatbank', 'monobank']

export function cardsAddCommand() {
  return async (context) => {
    const { localize } = context.state

    await context.reply(localize('command.cards.add.chooseBank'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        banks.map(bank => Markup.button.callback(localize(`banks.${bank}.long`), `cards:add:bank:${bank}`)),
        { columns: 1 }
      ).reply_markup
    })
  }
}

export function cardsAddBankAction({ userSessionManager }) {
  return async (context) => {
    const { userId, localize } = context.state

    await context.answerCbQuery()
    await context.deleteMessage()

    const message = await context.reply(
      localize('command.cards.add.sendCardNumber'),
      { parse_mode: 'MarkdownV2' }
    )

    await userSessionManager.setContext(userId, {
      bank: context.match[1],
      messageId: message.message_id,
    })

    await userSessionManager.setPhase(userId, Phases.addCard.number)
  }
}

export function cardsAddNumberMessage({ cardsStorage, userSessionManager }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { userId, localize } = context.state
    const { bank, messageId } = await userSessionManager.getContext(userId)

    if (!/^[\d\s]+$/.test(context.message.text)) {
      await userSessionManager.clear(userId)
      await context.reply(
        localize('command.cards.add.invalidCardNumber'),
        { parse_mode: 'MarkdownV2' },
      )
      return
    }

    if (context.message.text.split(/\d/).length - 1 !== 16) {
      await userSessionManager.clear(userId)
      await context.reply(
        localize('command.cards.add.invalidCardNumberLength'),
        { parse_mode: 'MarkdownV2' },
      )
      return
    }

    const number = formatCardNumber(context.message.text)

    await Promise.all([
      context.deleteMessage(),
      context.deleteMessage(messageId),
    ])

    const card = new Card({ userId, bank, number })

    await cardsStorage.create(card)

    await userSessionManager.clear(userId)
    await context.reply(
      localize('command.cards.add.saved', {
        number: escapeMd(number),
        bank: localize(`banks.${bank}.short`),
      }),
      { parse_mode: 'MarkdownV2' }
    )
  }
}

export function cardsDeleteCommand({ cardsStorage, userSessionManager }) {
  return async (context) => {
    const { userId, localize } = context.state
    const cards = await cardsStorage.findByUserId(userId)

    if (cards.length === 0) {
      await context.reply(
        localize('command.cards.delete.nothingToDelete'),
        { parse_mode: 'MarkdownV2' }
      )
      return
    }

    await context.reply(localize('command.cards.delete.chooseCard'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        cards.map(card => Markup.button.callback(
          localize('command.cards.delete.card', {
            number: card.number,
            bank: localize(`banks.${card.bank}.short`),
          }),
          `cards:delete:id:${card.id}`
        )),
        { columns: 1 }
      ).reply_markup
    })

    await userSessionManager.setPhase(userId, Phases.deleteCard.id)
  }
}

export function cardsDeleteIdAction({ cardsStorage, userSessionManager }) {
  return async (context) => {
    const { userId, localize } = context.state

    await context.answerCbQuery()
    await context.deleteMessage()

    const cardId = context.match[1]
    await cardsStorage.deleteById(cardId)

    await userSessionManager.clear(userId)
    await context.reply(localize('command.cards.delete.deleted'), { parse_mode: 'MarkdownV2' })
  }
}

export function cardsCommand({ usersStorage, userSessionManager }) {
  return async (context) => {
    const { userId, localize } = context.state
    const users = await usersStorage.findAll()

    await userSessionManager.clear(userId)
    await context.reply(localize('command.cards.get.chooseUser'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        users.map(user => Markup.button.callback(
          localize('command.cards.get.user', {
            name: user.name,
            username: user.username,
          }),
          `cards:get:user-id:${user.id}`
        )),
        { columns: 2 }
      ).reply_markup
    })
  }
}

export function cardsGetUserIdAction({ cardsStorage, usersStorage, userSessionManager }) {
  return async (context) => {
    const { userId, localize } = context.state

    await context.answerCbQuery()
    await context.deleteMessage()

    const cardUserId = context.match[1]
    const user = await usersStorage.findById(cardUserId)
    const userType = userId === cardUserId ? 'myself' : 'user'

    const cards = await cardsStorage.findByUserId(cardUserId)
    if (cards.length === 0) {
      await context.reply(
        localize(`command.cards.get.nothingToGet.${userType}`, { name: escapeMd(user.name) }),
        { parse_mode: 'MarkdownV2' }
      )
      return
    }

    await userSessionManager.clear(userId)
    await context.reply(localize(`command.cards.get.chooseCard.${userType}`, { name: escapeMd(user.name) }), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        cards.map(card => Markup.button.callback(
          localize('command.cards.get.card', {
            number: card.number,
            bank: localize(`banks.${card.bank}.short`),
          }),
          `cards:get:id:${card.id}`
        )),
        { columns: 1 }
      ).reply_markup
    })
  }
}

export function cardsGetIdAction({ cardsStorage, userSessionManager }) {
  return async (context) => {
    const { userId } = context.state

    await context.answerCbQuery()
    await context.deleteMessage()

    const cardId = context.match[1]
    const card = await cardsStorage.findById(cardId)

    await userSessionManager.clear(userId)
    const message = await context.reply(card.number)

    if (context.chat.type !== 'private') {
      setTimeout(async () => {
        await context.deleteMessage(message.message_id).catch(() => { })
      }, 60_000)
    }
  }
}
