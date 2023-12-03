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

export function cardsAddBankAction() {
  return async (context) => {
    const { userSession, localize } = context.state

    await context.answerCbQuery()
    await context.deleteMessage().catch(() => {})

    const message = await context.reply(
      localize('command.cards.add.sendCardNumber'),
      { parse_mode: 'MarkdownV2' }
    )

    await userSession.setContext({
      bank: context.match[1],
      messageId: message.message_id,
    })

    await userSession.setPhase(Phases.addCard.number)
  }
}

export function cardsAddNumberMessage({ cardsStorage }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { userSession, userId, localize } = context.state
    const { bank, messageId } = await userSession.getContext(userId)

    if (!/^[\d\s]+$/.test(context.message.text)) {
      await userSession.clear()
      await context.reply(
        localize('command.cards.add.invalidCardNumber'),
        { parse_mode: 'MarkdownV2' },
      )
      return
    }

    if (context.message.text.split(/\d/).length - 1 !== 16) {
      await userSession.clear()
      await context.reply(
        localize('command.cards.add.invalidCardNumberLength'),
        { parse_mode: 'MarkdownV2' },
      )
      return
    }

    const number = formatCardNumber(context.message.text)

    await Promise.all([
      context.deleteMessage().catch(() => {}),
      context.deleteMessage(messageId).catch(() => {}),
    ])

    const card = new Card({ userId, bank, number })

    await cardsStorage.create(card)

    await userSession.clear()
    await context.reply(
      localize('command.cards.add.saved', {
        number: escapeMd(number),
        bank: localize(`banks.${bank}.short`),
      }),
      { parse_mode: 'MarkdownV2' }
    )
  }
}

export function cardsDeleteCommand({ cardsStorage }) {
  return async (context) => {
    const { userSession, userId, localize } = context.state
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

    await userSession.setPhase(Phases.deleteCard.id)
  }
}

export function cardsDeleteIdAction({ cardsStorage }) {
  return async (context) => {
    const { userSession, localize } = context.state

    await context.answerCbQuery()
    await context.deleteMessage().catch(() => {})

    const cardId = context.match[1]
    await cardsStorage.deleteById(cardId)

    await userSession.clear()
    await context.reply(localize('command.cards.delete.deleted'), { parse_mode: 'MarkdownV2' })
  }
}

export function cardsCommand({ usersStorage, cardsStorage }) {
  return async (context) => {
    const { userSession, localize } = context.state
    const users = await usersStorage.findAll()
    const cards = await cardsStorage.findByUserIds(users.map(u => u.id))
    const userIds = new Set(cards.map(c => c.userId))
    const usersToShow = users.filter(u => userIds.has(u.id))

    await userSession.clear()
    if (usersToShow.length === 0) {
      await context.reply(localize('command.cards.get.empty'))
      return
    }

    await context.reply(localize('command.cards.get.chooseUser'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        usersToShow.map(user => Markup.button.callback(
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

export function cardsGetUserIdAction({ cardsStorage, usersStorage }) {
  return async (context) => {
    const { userSession, userId, localize } = context.state

    await context.answerCbQuery()
    await context.deleteMessage().catch(() => {})

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

    await userSession.clear()
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

export function cardsGetIdAction({ cardsStorage }) {
  return async (context) => {
    const { userSession } = context.state

    await context.answerCbQuery()
    await context.deleteMessage().catch(() => {})

    const cardId = context.match[1]
    const card = await cardsStorage.findById(cardId)

    await userSession.clear()
    await context.reply(`\`${escapeMd(card.number)}\``, { parse_mode: 'MarkdownV2' })
  }
}
