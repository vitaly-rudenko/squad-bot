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
        bank: escapeMd(context.state.localize(`banks.${bank}.short`)),
      }),
      { parse_mode: 'MarkdownV2' }
    )
  }
}

export function cardsDeleteCommand({ storage, userSessionManager }) {
  return async (context) => {
    const cards = await storage.findCardsByUserId(context.state.userId)

    if (cards.length === 0) {
      await context.reply('У тебя нет карт. Добавить карту можно с помощью /addcard')
      return
    }

    await context.reply('Выбери карту для удаления', {
      reply_markup: Markup.inlineKeyboard(
        cards.map(card => Markup.button.callback(
          `${card.number} (${card.bank})`,
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
    await context.reply('Карта была удалена')
  }
}

export function cardsGet({ usersStorage, userSessionManager }) {
  return async (context) => {
    const users = await usersStorage.findAll()

    await context.reply('Выбери пользователя', {
      reply_markup: Markup.inlineKeyboard(
        users.map(user => Markup.button.callback(
          `${user.name} (@${user.username})`,
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

    if (!user) {
      await context.reply('Пользователь еще не зарегистрирован.')
      return
    }

    const myself = context.state.userId === userId
    
    const cards = await storage.findCardsByUserId(userId)

    if (cards.length === 0) {
      await context.reply(
        myself
          ? 'У тебя нет карт. Добавить карту можно с помощью /addcard'
          : `У пользователя ${user.name} еще нет карт.`
      )
      return
    }

    await context.reply(myself ? 'Выбери свою карту' : `Выбери карту пользователя ${user.name}`, {
      reply_markup: Markup.inlineKeyboard(
        cards.map(card => Markup.button.callback(
          `${card.number} (${card.bank})`,
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
        await context.deleteMessage(message.message_id).catch(() => {})
      }, 60_000)
    }
  }
}
