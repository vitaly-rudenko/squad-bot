import { Markup } from 'telegraf'
import { Phases } from '../../Phases.js'
import { escapeMd } from '../../utils/escapeMd.js'
import { formatCardNumber } from '../../utils/formatCardNumber.js'

const banks = ['privatbank', 'monobank']

export function cardsAddCommand({ userSessionManager }) {
  return async (context) => {
    await context.reply(context.state.localize('command.cards.add.chooseBank'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        banks.map(bank => Markup.button.callback(context.state.localize(`banks.${bank}.long`), `cards:add:bank:${bank}`)),
        { columns: 1 }
      ).reply_markup
    })

    userSessionManager.setPhase(context.state.userId, Phases.addCard.bank)
  }
}

export function cardsAddBankAction({ userSessionManager }) {
  return async (context) => {
    await context.answerCbQuery()
    await context.deleteMessage()

    const bank = context.match[1]
    userSessionManager.context(context.state.userId).bank = bank

    const message = await context.reply(
      context.state.localize('command.cards.add.sendCardNumber'),
      { parse_mode: 'MarkdownV2' }
    )
    userSessionManager.context(context.state.userId).messageId = message.message_id
    userSessionManager.setPhase(context.state.userId, Phases.addCard.number)
  }
}

export function cardsAddNumberMessage({ storage, userSessionManager }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { bank, messageId } = userSessionManager.context(context.state.userId)

    if (!/^[\d\s]+$/.test(context.message.text)) {
      await context.reply(
        context.state.localize('command.cards.add.invalidCardNumber'),
        { parse_mode: 'MarkdownV2' },
      )
      userSessionManager.clear(context.state.userId)
      return
    }

    if (context.message.text.split(/\d/).length - 1 !== 16) {
      await context.reply(
        context.state.localize('command.cards.add.invalidCardNumberLength'),
        { parse_mode: 'MarkdownV2' },
      )
      userSessionManager.clear(context.state.userId)
      return
    }

    const number = formatCardNumber(context.message.text)

    await Promise.all([
      context.deleteMessage(),
      context.deleteMessage(messageId),
    ])

    await storage.createCard({
      userId: context.state.userId,
      bank,
      number,
    })

    userSessionManager.clear(context.state.userId)
    await context.reply(
      context.state.localize('command.cards.add.saved', {
        number: escapeMd(number),
        bank: context.state.localize(`banks.${bank}.short`),
      }),
      { parse_mode: 'MarkdownV2' }
    )
  }
}

export function cardsDeleteCommand({ storage, userSessionManager }) {
  return async (context) => {
    const cards = await storage.findCardsByUserId(context.state.userId)

    if (cards.length === 0) {
      await context.reply(
        context.state.localize('command.cards.delete.nothingToDelete'),
        { parse_mode: 'MarkdownV2' }
      )
      return
    }

    await context.reply(context.state.localize('command.cards.delete.chooseCard'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        cards.map(card => Markup.button.callback(
          context.state.localize('command.cards.delete.card', {
            number: card.number,
            bank: context.state.localize(`banks.${card.bank}.short`),
          }),
          `cards:delete:id:${card.id}`
        )),
        { columns: 1 }
      ).reply_markup
    })

    userSessionManager.setPhase(context.state.userId, Phases.deleteCard.id)
  }
}

export function cardsDeleteIdAction({ storage, userSessionManager }) {
  return async (context) => {
    await context.answerCbQuery()
    await context.deleteMessage()

    const cardId = context.match[1]
    await storage.deleteCardById(cardId)

    userSessionManager.clear(context.state.userId)
    await context.reply(
      context.state.localize('command.cards.delete.deleted'),
      { parse_mode: 'MarkdownV2' }
    )
  }
}

export function cardsGet({ usersStorage, userSessionManager }) {
  return async (context) => {
    const users = await usersStorage.findAll()

    await context.reply(context.state.localize('command.cards.get.chooseUser'), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        users.map(user => Markup.button.callback(
          context.state.localize('command.cards.get.user', {
            name: user.name,
            username: user.name,
          }),
          `cards:get:user-id:${user.id}`
        )),
        { columns: 2 }
      ).reply_markup
    })

    userSessionManager.setPhase(context.state.userId, Phases.getCard.userId)
  }
}

export function cardsGetUserIdAction({ storage, usersStorage, userSessionManager }) {
  return async (context) => {
    await context.answerCbQuery()
    await context.deleteMessage()

    const userId = context.match[1]
    const user = await usersStorage.findById(userId)
    const userType = context.state.userId === userId ? 'myself' : 'user'

    const cards = await storage.findCardsByUserId(userId)

    if (cards.length === 0) {
      await context.reply(
        context.state.localize(`command.cards.get.nothingToGet.${userType}`, { name: escapeMd(user.name) }),
        { parse_mode: 'MarkdownV2' }
      )
      return
    }

    await context.reply(context.state.localize(`command.cards.get.chooseCard.${userType}`, { name: escapeMd(user.name) }), {
      parse_mode: 'MarkdownV2',
      reply_markup: Markup.inlineKeyboard(
        cards.map(card => Markup.button.callback(
          context.state.localize('command.cards.get.card', {
            number: card.number,
            bank: context.state.localize(`banks.${card.bank}.short`),
          }),
          `cards:get:id:${card.id}`
        )),
        { columns: 1 }
      ).reply_markup
    })

    userSessionManager.setPhase(context.state.userId, Phases.getCard.id)
  }
}

export function cardsGetIdAction({ storage, userSessionManager }) {
  return async (context) => {
    await context.answerCbQuery()
    await context.deleteMessage()

    const cardId = context.match[1]
    const card = await storage.getCardById(cardId)

    userSessionManager.clear(context.state.userId)
    const message = await context.reply(card.number)

    if (context.chat.type !== 'private') {
      setTimeout(async () => {
        await context.deleteMessage(message.message_id).catch(() => { })
      }, 60_000)
    }
  }
}
