import './env.js'

import pg from 'pg'
import { Telegraf } from 'telegraf'
import { MembershipPostgresStorage } from '../app/chats/MembershipPostgresStorage.js'
import { MembershipManager } from '../app/chats/MembershipManager.js'
import { MembershipInMemoryCache } from '../app/chats/MembershipInMemoryCache.js'
import { TelegramErrorLogger } from '../app/shared/TelegramErrorLogger.js'

(async () => {
  const pgClient = new pg.Client(process.env.DATABASE_URL)
  await pgClient.connect()

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const bot = new Telegraf(telegramBotToken)

  const membershipStorage = new MembershipPostgresStorage(pgClient)
  const membershipManager = new MembershipManager({
    telegram: bot.telegram,
    membershipCache: new MembershipInMemoryCache(),
    membershipStorage,
  })

  const memberships = await membershipStorage.findOldestUserIds({ limit: 10 })

  const debugChatId = process.env.DEBUG_CHAT_ID
  const errorLogger = new TelegramErrorLogger({ telegram: bot.telegram, debugChatId })

  for (const { userId, chatId } of memberships) {
    console.log(`Refreshing membership of user ${userId} in chat: ${chatId}`)

    try {
      await membershipManager.refreshLink(userId, chatId)
    } catch (error) {
      errorLogger.log(error)
    }
  }

  console.log('Done!')
})()
