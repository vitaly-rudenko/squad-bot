import { Markup } from 'telegraf'
import { phases } from '../phases.js'

export function cardsAddCommand({ userSessionManager }) {
  return async (context) => {
    await context.reply('Какой банк?', {
      reply_markup: Markup.inlineKeyboard([
        Markup.button.callback('Приватбанк', 'cards:add:bank:privatbank'),
        Markup.button.callback('Монобанк', 'cards:add:bank:monobank'),
      ]).reply_markup
    })
    
    userSessionManager.setPhase(context.state.userId, phases.addCard.bank)
  }
}

export function cardsAddBankAction({ userSessionManager }) {
  return async (context) => {
    await context.answerCbQuery()
    await context.deleteMessage()

    const bank = context.match[1]
    userSessionManager.context(context.state.userId).bank = bank

    const message = await context.reply('Отправь номер карты')
    userSessionManager.context(context.state.userId).messageId = message.message_id

    userSessionManager.setPhase(context.state.userId, phases.addCard.number)
  }
}

export function cardsAddNumberMessage({ storage, userSessionManager }) {
  return async (context) => {
    if (!('text' in context.message)) return

    const { bank, messageId } = userSessionManager.context(context.state.userId)
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
    await context.reply(`Карта была сохранена: ${number} (${bank})`)
  }
}

export function formatCardNumber(number) {
  return number.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim()
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

    userSessionManager.setPhase(context.state.userId, phases.deleteCard.id)
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

const GET_CARDS_REGEX = /\/cards( (?<username>.+))?/s

export function cardsGet({ storage, userSessionManager }) {
  return async (context, next) => {
    console.log(context.message.text)
    if (!GET_CARDS_REGEX.test(context.message.text)) {
      await next()
      return
    }

    const match = context.message.text.match(GET_CARDS_REGEX)
    let { username } = match.groups

    let user
    if (username) {
      if (username.startsWith('@')) {
        username = username.slice(1)
      }

      user = await storage.findUserByUsername(username)
    } else {
      user = await storage.findUserById(context.state.userId)
    }

    if (!user) {
      await context.reply('Не могу найти этого пользователя')
      return
    }

    const cards = await storage.findCardsByUserId(user.id)

    if (cards.length === 0) {
      await context.reply('У тебя нет карт. Добавить карту можно с помощью /addcard')
      return
    }

    await context.reply(`Выбери карту пользователя ${user.name}`, {
      reply_markup: Markup.inlineKeyboard(
        cards.map(card => Markup.button.callback(
          `${card.number} (${card.bank})`,
          `cards:get:id:${card.id}`
        )),
        { columns: 1 }
      ).reply_markup
    })

    userSessionManager.setPhase(context.state.userId, phases.getCard.id)
  }
}

export function cardsGetIdAction({ storage, userSessionManager }) {
  return async (context) => {
    await context.answerCbQuery()
    await context.deleteMessage()

    const cardId = context.match[1]
    const card = await storage.getCardById(cardId)

    userSessionManager.clear(context.state.userId)
    await context.reply(card.number)
  }
}
